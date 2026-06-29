export type JobUrlKind =
  | 'linkedin'
  | 'workday'
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'aggregator'
  | 'generic'

export interface WorkdayUrlParts {
  tenant: string
  wdHost: string
  board: string
  jobPath: string
  origin: string
}

const LINKEDIN_HOST = /^(www\.)?linkedin\.com$/i

const AGGREGATOR_HOSTS = [
  'indeed.com',
  'www.indeed.com',
  'ziprecruiter.com',
  'www.ziprecruiter.com',
  'glassdoor.com',
  'www.glassdoor.com',
]

export function isLinkedInJobUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    if (!LINKEDIN_HOST.test(u.hostname)) return false
    return /\/jobs?\//i.test(u.pathname) || u.pathname.includes('/job/view/')
  } catch {
    return false
  }
}

export function isAggregatorJobUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return AGGREGATOR_HOSTS.some(h => u.hostname.toLowerCase() === h)
  } catch {
    return false
  }
}

export function parseWorkdayUrl(url: string): WorkdayUrlParts | null {
  try {
    const u = new URL(url.trim())
    const hostMatch = u.hostname.match(/^([^.]+)\.(wd\d+)\.myworkdayjobs\.com$/i)
    if (!hostMatch) return null

    const [, tenant, wdHost] = hostMatch
    const parts = u.pathname.split('/').filter(Boolean)
    const jobIdx = parts.findIndex(p => p.toLowerCase() === 'job')
    if (jobIdx < 1 || jobIdx >= parts.length - 1) return null

    let boardIdx = jobIdx - 1
    if (parts[0]?.match(/^[a-z]{2}-[A-Z]{2}$/i)) {
      boardIdx = jobIdx - 1
      if (boardIdx < 1) return null
    }

    const board = parts[boardIdx]
    const jobPath = parts.slice(jobIdx + 1).join('/')
    if (!board || !jobPath) return null

    return {
      tenant,
      wdHost,
      board,
      jobPath,
      origin: `https://${u.hostname}`,
    }
  } catch {
    return null
  }
}

export function buildWorkdayApiUrl(parts: WorkdayUrlParts): string {
  return `${parts.origin}/wday/cxs/${parts.tenant}/${parts.board}/job/${parts.jobPath}`
}

export function detectJobUrlKind(url: string): JobUrlKind {
  if (isLinkedInJobUrl(url)) return 'linkedin'
  if (parseWorkdayUrl(url)) return 'workday'
  if (url.includes('greenhouse.io')) return 'greenhouse'
  if (url.includes('lever.co')) return 'lever'
  if (url.includes('ashbyhq.com')) return 'ashby'
  if (isAggregatorJobUrl(url)) return 'aggregator'
  return 'generic'
}

export const LINKEDIN_PASTE_MESSAGE =
  'LinkedIn blocks automated access. Paste the job description text in the Paste Text tab instead.'

export const AGGREGATOR_WARNING =
  'This looks like an aggregator link. The original posting may have changed or been removed — verify on the employer\'s career site if you can.'
