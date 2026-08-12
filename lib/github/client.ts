import type { GitHubApiRepo, GitHubApiUser, GitHubRepoSnapshot } from './types'
import { repoStatus } from './repo-status'

const GITHUB_API = 'https://api.github.com'

async function githubFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

export async function fetchGitHubUser(token: string): Promise<GitHubApiUser> {
  return githubFetch<GitHubApiUser>('/user', token)
}

export async function fetchUserRepos(token: string, maxPages = 2): Promise<GitHubApiRepo[]> {
  const repos: GitHubApiRepo[] = []
  for (let page = 1; page <= maxPages; page++) {
    const batch = await githubFetch<GitHubApiRepo[]>(
      `/user/repos?sort=pushed&per_page=100&page=${page}&affiliation=owner`,
      token
    )
    repos.push(...batch)
    if (batch.length < 100) break
  }
  return repos
}

async function fetchRepoLanguages(fullName: string, token: string): Promise<string[]> {
  try {
    const data = await githubFetch<Record<string, number>>(`/repos/${fullName}/languages`, token)
    return Object.keys(data).sort((a, b) => (data[b] ?? 0) - (data[a] ?? 0))
  } catch {
    return []
  }
}

export async function snapshotRepos(repos: GitHubApiRepo[], token: string): Promise<GitHubRepoSnapshot[]> {
  const owned = repos.filter(r => !r.fork)
  const top = owned.slice(0, 30)

  return Promise.all(
    top.map(async repo => {
      const languages = await fetchRepoLanguages(repo.full_name, token)
      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        description: repo.description,
        languages,
        stars: repo.stargazers_count,
        pushedAt: repo.pushed_at,
        status: repoStatus(repo),
        topics: repo.topics ?? [],
        isFork: repo.fork,
        isPrivate: repo.private,
      }
    })
  )
}
