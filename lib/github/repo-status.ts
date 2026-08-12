import type { GitHubApiRepo, GitHubRepoStatus } from './types'

const STALE_MS = 180 * 24 * 60 * 60 * 1000 // ~6 months

export function repoStatus(repo: Pick<GitHubApiRepo, 'archived' | 'pushed_at'>, now = Date.now()): GitHubRepoStatus {
  if (repo.archived) return 'archived'
  const pushed = new Date(repo.pushed_at).getTime()
  if (Number.isNaN(pushed) || now - pushed > STALE_MS) return 'stale'
  return 'active'
}

export function normalizeRepoName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.git$/, '')
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/[^a-z0-9]/g, '')
}

export function repoMatchesProject(
  repo: { fullName: string; htmlUrl: string; name: string },
  project: { name: string; github: string }
): boolean {
  const repoKey = normalizeRepoName(repo.fullName)
  const nameKey = normalizeRepoName(project.name)
  if (repoKey && nameKey && (repoKey.endsWith(nameKey) || nameKey.endsWith(normalizeRepoName(repo.name)))) {
    return true
  }
  if (project.github) {
    const ghKey = normalizeRepoName(project.github)
    if (ghKey && (ghKey === repoKey || ghKey.endsWith(normalizeRepoName(repo.name)))) return true
  }
  return false
}
