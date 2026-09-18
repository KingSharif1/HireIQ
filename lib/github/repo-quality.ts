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
    .replace(/<[^>]+>/g, ' ')
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
  return `${body.slice(0, maxLen - 1).trim()}...`
}

export function hasCodeStructure(rootPaths: string[] | undefined): boolean {
  if (!rootPaths?.length) return false
  return rootPaths.some(p => CODE_ROOT_HINTS.has(p.toLowerCase().replace(/\/.*$/, '')))
}

/**
 * Username / profile README repos (e.g. KingSharif1/KingSharif1) — almost only a README.
 * These should link to a real portfolio project, not become their own card.
 */
export function isProfileReadmeRepo(
  repo: Pick<GitHubRepoSnapshot, 'name' | 'fullName' | 'languages' | 'tools' | 'rootPaths'>,
  username?: string | null
): boolean {
  const owner = (username ?? repo.fullName.split('/')[0] ?? '').toLowerCase()
  const name = repo.name.toLowerCase()
  if (!owner || name !== owner) return false

  const hasLangs = repo.languages.length > 0
  const hasTools = (repo.tools?.length ?? 0) > 0
  const hasStructure = hasCodeStructure(repo.rootPaths)
  if (hasLangs || hasTools || hasStructure) return false

  const roots = (repo.rootPaths ?? []).map(p => p.toLowerCase().replace(/\/.*$/, ''))
  if (roots.length === 0) return true
  const codeish = roots.filter(
    p => !['readme.md', 'readme', 'license', 'license.md', '.gitignore', 'docs'].includes(p)
  )
  return codeish.length === 0
}

/** Prefer portfolio / personal sites when linking a profile README repo. */
export function isPortfolioLikeProject(project: {
  name: string
  url?: string
  description?: string
}): boolean {
  const blob = `${project.name} ${project.url ?? ''} ${project.description ?? ''}`.toLowerCase()
  return /portfolio|personal|resume|cv|website|homepage/.test(blob)
}

export function hostnameFromUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null
  try {
    const host = new URL(url.includes('://') ? url : `https://${url}`).hostname.toLowerCase()
    return host.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Skip repos that are empty shells, stale placeholders, or have no real project signal.
 * Used before suggesting new profile projects — matched projects may still get bullets.
 */
export function isMeaningfulRepo(repo: GitHubRepoSnapshot): boolean {
  if (repo.isPrivate || repo.isFork) return false
  if (repo.status === 'archived') return false
  if (isProfileReadmeRepo(repo)) return false

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
