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

/** Generic tokens that should never decide a match on their own. */
const MATCH_STOP_TOKENS = new Set([
  'app',
  'web',
  'site',
  'website',
  'project',
  'projects',
  'repo',
  'portfolio',
  'demo',
  'my',
])

/** Split a name/URL into meaningful word tokens (keeps word boundaries). */
export function repoNameTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/\.git$/, '')
    .replace(/^https?:\/\/github\.com\//, '')
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 1 && !MATCH_STOP_TOKENS.has(t))
}

/**
 * Token-containment match: every meaningful token of the shorter name must
 * appear in the longer name. Handles affixes on either side —
 * repo "mapping-robot-ros2" vs project "Mapping Robot", or
 * project "Cowboy Cards — SaaS flashcard app" vs repo "cowboy-cards".
 * A single-token name must be at least 4 chars to match (avoids "api"-style collisions).
 */
export function tokenSetMatches(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a]
  if (shorter.length === 1 && shorter[0].length < 4) return false
  const longerSet = new Set(longer)
  return shorter.every(t => longerSet.has(t))
}

export function repoMatchesProject(
  repo: { fullName: string; htmlUrl: string; name: string },
  project: { name: string; github?: string | null }
): boolean {
  // 1. Explicit URL on the project always wins.
  if (project.github?.trim()) {
    const ghKey = normalizeRepoName(project.github)
    const repoKey = normalizeRepoName(repo.fullName)
    if (ghKey && repoKey && (ghKey === repoKey || ghKey.endsWith(normalizeRepoName(repo.name)))) {
      return true
    }
  }
  // 2. Token containment on the repo *name* (not fullName — the username
  //    would pollute the token set). Affix-proof in both directions.
  const nameTokens = repoNameTokens(project.name)
  if (tokenSetMatches(repoNameTokens(repo.name), nameTokens)) return true
  // 3. Legacy boundary-stripped suffix check as a final fallback, gated on a
  //    meaningful name length so "API" never matches every "*-api" repo.
  const repoKey = normalizeRepoName(repo.fullName)
  const nameKey = normalizeRepoName(project.name)
  if (nameKey.length >= 4 && repoKey && repoKey.endsWith(nameKey)) {
    return true
  }
  return false
}
