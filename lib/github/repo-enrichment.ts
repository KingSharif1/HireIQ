import type { GitHubApiRepo, GitHubRepoSnapshot } from './types'
import { cleanReadmeExcerpt, hasCodeStructure } from './repo-quality'

const GITHUB_API = 'https://api.github.com'

const NOTABLE_DEPS = new Set([
  'next',
  'react',
  'react-dom',
  'vue',
  'nuxt',
  'svelte',
  'express',
  'fastify',
  'nestjs',
  '@nestjs/core',
  'prisma',
  '@prisma/client',
  'drizzle-orm',
  'supabase',
  '@supabase/supabase-js',
  'tailwindcss',
  'playwright',
  '@playwright/test',
  'typescript',
  'vite',
  'electron',
  'three',
  'tensorflow',
  '@tensorflow/tfjs',
  'openai',
  '@anthropic-ai/sdk',
  'stripe',
  'firebase',
  'mongodb',
  'mongoose',
  'redis',
  'ioredis',
  'graphql',
  '@apollo/server',
  'trpc',
  '@trpc/server',
  'aws-sdk',
  '@aws-sdk/client-s3',
  'docker',
  'kubernetes-client',
  'langchain',
  '@langchain/core',
])

interface GitHubContentItem {
  name: string
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  path: string
}

interface GitHubReadme {
  content?: string
  encoding?: string
}

function decodeBase64Utf8(content: string): string {
  try {
    return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

async function githubFetch<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function fetchReadmeExcerpt(fullName: string, token: string, isPrivate: boolean): Promise<string> {
  const data = await githubFetch<GitHubReadme>(`/repos/${fullName}/readme`, token)
  if (data?.content) {
    const raw = decodeBase64Utf8(data.content)
    const cleaned = cleanReadmeExcerpt(raw)
    if (cleaned.length >= 40) return cleaned
  }

  if (isPrivate) return ''

  const [owner, repo] = fullName.split('/')
  if (!owner || !repo) return ''

  for (const branch of ['main', 'master', 'develop']) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`, {
        next: { revalidate: 0 },
      })
      if (!res.ok) continue
      const cleaned = cleanReadmeExcerpt(await res.text())
      if (cleaned.length >= 40) return cleaned
    } catch {
      continue
    }
  }
  return ''
}

async function fetchRootPaths(fullName: string, token: string, isPrivate: boolean): Promise<string[]> {
  const items = await githubFetch<GitHubContentItem[]>(`/repos/${fullName}/contents`, token)
  if (Array.isArray(items) && items.length) {
    return items.filter(i => i.type === 'dir' || i.type === 'file').map(i => i.name)
  }

  if (isPrivate) return []

  const [owner, repo] = fullName.split('/')
  if (!owner || !repo) return []

  for (const branch of ['main', 'master']) {
    const items = await githubFetch<GitHubContentItem[]>(
      `/repos/${fullName}/contents?ref=${branch}`,
      token
    )
    if (Array.isArray(items) && items.length) {
      return items.filter(i => i.type === 'dir' || i.type === 'file').map(i => i.name)
    }
  }
  return []
}

async function fetchPackageTools(fullName: string, token: string, isPrivate: boolean): Promise<string[]> {
  const data = await githubFetch<GitHubContentItem & { content?: string }>(
    `/repos/${fullName}/contents/package.json`,
    token
  )
  if (data?.content) {
    const tools = toolsFromPackageJson(decodeBase64Utf8(data.content))
    if (tools.length) return tools
  }

  if (isPrivate) return []

  const [owner, repo] = fullName.split('/')
  if (!owner || !repo) return []

  for (const branch of ['main', 'master']) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`,
        { next: { revalidate: 0 } }
      )
      if (!res.ok) continue
      const tools = toolsFromPackageJson(await res.text())
      if (tools.length) return tools
    } catch {
      continue
    }
  }
  return []
}

function toolsFromPackageJson(text: string): string[] {
  try {
    const pkg = JSON.parse(text) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]
    const picked: string[] = []
    for (const name of names) {
      const key = name.toLowerCase()
      if (NOTABLE_DEPS.has(key) || NOTABLE_DEPS.has(name)) {
        const label = name.startsWith('@') ? name.split('/')[1] ?? name : name
        picked.push(label.replace(/^@/, ''))
      }
    }
    return [...new Set(picked)].slice(0, 10)
  } catch {
    return []
  }
}

export async function enrichRepo(repo: GitHubApiRepo, token: string): Promise<RepoEnrichment> {
  const isPrivate = repo.private
  const [readmeExcerpt, rootPaths, tools] = await Promise.all([
    fetchReadmeExcerpt(repo.full_name, token, isPrivate),
    fetchRootPaths(repo.full_name, token, isPrivate),
    fetchPackageTools(repo.full_name, token, isPrivate),
  ])
  return { readmeExcerpt, rootPaths, tools }
}

/** Run enrichment with bounded concurrency to respect GitHub rate limits. */
export async function enrichReposBatch(
  repos: GitHubApiRepo[],
  token: string,
  concurrency = 4
): Promise<Map<number, RepoEnrichment>> {
  const out = new Map<number, RepoEnrichment>()
  for (let i = 0; i < repos.length; i += concurrency) {
    const batch = repos.slice(i, i + concurrency)
    const results = await Promise.all(batch.map(r => enrichRepo(r, token)))
    batch.forEach((repo, idx) => out.set(repo.id, results[idx]))
  }
  return out
}

export interface RepoEnrichment {
  readmeExcerpt: string
  rootPaths: string[]
  tools: string[]
}

function headlineFromRepo(repo: GitHubRepoSnapshot): string {
  const fromReadme = repo.readmeExcerpt?.trim()
  if (fromReadme && fromReadme.length >= 40) {
    const sentence = fromReadme.match(/^[^.!?]+[.!?]?/)?.[0]?.trim()
    if (sentence && sentence.length >= 30) return sentence.replace(/[.!?]+$/, '')
    return fromReadme.slice(0, 140).trim()
  }
  const fromDesc = repo.description?.trim()
  if (fromDesc) return fromDesc
  if (repo.topics.length) {
    return `${repo.name} — ${repo.topics.slice(0, 4).join(', ')} project`
  }
  return repo.name
}

export function buildRepoHighlight(repo: GitHubRepoSnapshot): string {
  let headline = headlineFromRepo(repo)
  if (repo.readmeExcerpt && headline.length >= 30 && !/^built\b/i.test(headline)) {
    headline = `Built ${repo.name} — ${headline.charAt(0).toLowerCase()}${headline.slice(1)}`
  }

  const packageTools = (repo.tools ?? []).filter(t => !repo.languages.includes(t))
  const stackParts = [...new Set([...packageTools, ...repo.languages.slice(0, 3)])].slice(0, 5)

  const structureBits: string[] = []
  if (hasCodeStructure(repo.rootPaths)) {
    const dirs = (repo.rootPaths ?? [])
      .filter(p =>
        ['src', 'app', 'components', 'lib', 'api', 'services', 'packages'].includes(p.toLowerCase())
      )
      .slice(0, 3)
    if (dirs.length) structureBits.push(`${dirs.join('/')} structure`)
  }

  const parts: string[] = [headline]
  if (packageTools.length) {
    parts.push(`Tools: ${packageTools.join(', ')}`)
  } else if (stackParts.length && (repo.readmeExcerpt || repo.description)) {
    parts.push(`Tech: ${stackParts.join(', ')}`)
  }
  if (structureBits.length) parts.push(structureBits[0])
  if (repo.topics.length && !repo.description && !repo.readmeExcerpt) {
    parts.push(`Topics: ${repo.topics.slice(0, 4).join(', ')}`)
  }

  let bullet = parts.join(' · ')
  if (repo.stars > 0) bullet += ` · ${repo.stars} GitHub stars`
  return bullet.length > 240 ? `${bullet.slice(0, 237).trim()}…` : bullet
}
