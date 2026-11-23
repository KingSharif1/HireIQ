/**
 * Company-name hygiene shared by the scraper (at save time) and the UI/tailor
 * (for jobs saved before the scraper fix). ATS board tokens such as
 * "freeformfuturecorp" must never reach a resume, cover letter, or the tracker.
 */

const GENERIC_BOARD_NAMES = new Set(['greenhouse', 'jobs', 'job', 'careers', 'boards', 'job board', 'unknown'])

const CORPORATE_SUFFIXES = ['technologies', 'technology', 'corporation', 'company', 'systems', 'labs', 'corp', 'inc', 'llc', 'hq', 'ai', 'co']

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** True when a name is a real company, not the board slug or a generic label. */
export function isUsableCompanyName(name: string | null | undefined, boardToken: string): boolean {
  const trimmed = name?.replace(/\s+/g, ' ').trim() ?? ''
  if (trimmed.length < 2) return false
  const lower = trimmed.toLowerCase()
  if (GENERIC_BOARD_NAMES.has(lower)) return false
  const c = compact(trimmed)
  const token = compact(boardToken)
  if (c && token && c === token) return false
  return true
}

/** Last-resort prettifier for a board token: "freeformfuturecorp" → "Freeformfuture Corp". */
export function humanizeBoardToken(token: string): string {
  let spaced = token
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
  if (!/\s/.test(spaced)) {
    const lower = spaced.toLowerCase()
    const suffix = CORPORATE_SUFFIXES.find((s) => lower.endsWith(s) && lower.length > s.length + 2)
    if (suffix) spaced = `${spaced.slice(0, -suffix.length)} ${spaced.slice(-suffix.length)}`
  }
  return spaced
    .split(/\s+/)
    .map((w) => (w.toLowerCase() === 'ai' || w.toLowerCase() === 'hq' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

/** Board token from a Greenhouse / Lever / Ashby posting URL, if any. */
export function boardTokenFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    const first = u.pathname.split('/').filter(Boolean)[0] ?? ''
    if (/(^|\.)greenhouse\.io$/.test(host) || host === 'jobs.lever.co' || host === 'jobs.ashbyhq.com') {
      return first && first !== 'embed' ? first : u.searchParams.get('for')
    }
    return null
  } catch {
    return null
  }
}

/**
 * The company name to show or send to the model. Fixes jobs stored with the
 * raw board token (or an empty/"Unknown" company) by humanizing the token.
 */
export function displayCompanyName(company: string | null | undefined, applyUrl?: string | null): string {
  const name = company?.replace(/\s+/g, ' ').trim() ?? ''
  const token = boardTokenFromUrl(applyUrl)
  if (!token) return name
  if (!isUsableCompanyName(name, token)) return humanizeBoardToken(token)
  return name
}
