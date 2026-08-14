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

async function fetchReadmeExcerpt(fullName: string, token: string): Promise<string> {
  const data = await githubFetch<GitHubReadme>(`/repos/${fullName}/readme`, token)
  if (!data?.content) return ''
  const raw = decodeBase64Utf8(data.content)
  return cleanReadmeExcerpt(raw)
}

async function fetchRootPaths(fullName: string, token: string): Promise<string[]> {
  const items = await githubFetch<GitHubContentItem[]>(`/repos/${fullName}/contents`, token)
  if (!Array.isArray(items)) return []
  return items.filter(i => i.type === 'dir' || i.type === 'file').map(i => i.name)
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

async function fetchPackageTools(fullName: string, token: string): Promise<string[]> {
  const data = await githubFetch<GitHubContentItem & { content?: string }>(
    `/repos/${fullName}/contents/package.json`,
    token
  )
  if (!data?.content) return []
  const raw = decodeBase64Utf8(data.content)
  return toolsFromPackageJson(raw)
}

export interface RepoEnrichment {
  readmeExcerpt: string
  rootPaths: string[]
  tools: string[]
}

export async function enrichRepo(repo: GitHubApiRepo, token: string): Promise<RepoEnrichment> {
  const [readmeExcerpt, rootPaths, tools] = await Promise.all([
    fetchReadmeExcerpt(repo.full_name, token),
    fetchRootPaths(repo.full_name, token),
    fetchPackageTools(repo.full_name, token),
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

export function buildRepoHighlight(repo: GitHubRepoSnapshot): string {
  const fromReadme = repo.readmeExcerpt?.trim()
  const fromDesc = repo.description?.trim()
  const headline =
    (fromReadme && fromReadme.length >= 40 ? fromReadme.split(/[.!?]/)[0]?.trim() : '') ||
    fromDesc ||
    repo.name

  const toolSet = new Set<string>()
  for (const t of repo.tools ?? []) toolSet.add(t)
  for (const lang of repo.languages.slice(0, 4)) toolSet.add(lang)
  const tools = [...toolSet].slice(0, 6)

  const structureBits: string[] = []
  if (hasCodeStructure(repo.rootPaths)) {
    const dirs = (repo.rootPaths ?? [])
      .filter(p => ['src', 'app', 'components', 'lib', 'api', 'services', 'packages'].includes(p.toLowerCase()))
      .slice(0, 3)
    if (dirs.length) structureBits.push(`${dirs.join('/')} layout`)
  }

  const parts: string[] = [headline]
  if (tools.length) parts.push(`Stack: ${tools.join(', ')}`)
  if (structureBits.length) parts.push(structureBits[0])

  let bullet = parts.join(' — ')
  if (repo.stars > 0) bullet += ` (${repo.stars} GitHub stars)`
  return bullet.length > 220 ? `${bullet.slice(0, 217).trim()}…` : bullet
}
