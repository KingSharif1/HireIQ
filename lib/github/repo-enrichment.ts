import type { GitHubApiRepo } from './types'
import { cleanReadmeExcerpt } from './repo-quality'

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

export { buildRepoHighlight } from './resume-bullet'
