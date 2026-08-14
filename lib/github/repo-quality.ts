import type { GitHubRepoSnapshot } from './types'

const CODE_ROOT_HINTS = new Set([
  'src',
  'app',
  'apps',
  'lib',
  'libs',
  'components',
  'pages',
  'api',
  'server',
  'services',
  'packages',
  'backend',
  'frontend',
  'client',
  'functions',
  'supabase',
  'prisma',
  'migrations',
])

/** Strip markdown noise for short excerpts. */
export function cleanReadmeExcerpt(raw: string, maxLen = 480): string {
  const lines = raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line =>
      line
        .replace(/^#{1,6}\s+/, '')
        .replace(/!\[[^\]]*]\([^)]+\)/g, '')
        .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
        .replace(/`+/g, '')
        .trim()
    )
    .filter(line => line.length > 0 && !/^[-*_=]{3,}$/.test(line))

  const body = lines.join(' ').replace(/\s+/g, ' ').trim()
  if (body.length <= maxLen) return body
  return `${body.slice(0, maxLen - 1).trim()}…`
}

export function hasCodeStructure(rootPaths: string[] | undefined): boolean {
  if (!rootPaths?.length) return false
  return rootPaths.some(p => CODE_ROOT_HINTS.has(p.toLowerCase().replace(/\/.*$/, '')))
}

/**
 * Skip repos that are empty shells, stale placeholders, or have no real project signal.
 * Used before suggesting new profile projects — matched projects may still get bullets.
 */
export function isMeaningfulRepo(repo: GitHubRepoSnapshot): boolean {
  if (repo.isPrivate || repo.isFork) return false
  if (repo.status === 'archived') return false

  const desc = repo.description?.trim() ?? ''
  const readme = repo.readmeExcerpt?.trim() ?? ''
  const hasReadme = readme.length >= 60
  const hasDesc = desc.length >= 12
  const hasLangs = repo.languages.length > 0
  const hasTools = (repo.tools?.length ?? 0) > 0
  const hasStructure = hasCodeStructure(repo.rootPaths)
  const hasStars = repo.stars > 0
  const hasTopics = repo.topics.length > 0

  const signalCount = [hasReadme, hasDesc, hasLangs, hasTools, hasStructure, hasStars, hasTopics].filter(
    Boolean
  ).length

  if (signalCount === 0) return false

  // Default GitHub init: README title only, no code, no description.
  if (!hasLangs && !hasStructure && !hasTools && readme.length < 80 && !hasDesc && !hasStars) {
    return false
  }

  // Very stale with almost no content — likely abandoned placeholder.
  if (repo.status === 'stale' && signalCount <= 1 && !hasStars && !hasReadme) {
    return false
  }

  return true
}
