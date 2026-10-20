/**
 * Is a job posting still live? Classifies a fetched page; the network wrapper
 * refuses private or local targets.
 */

export type LivenessState = 'live' | 'closed' | 'blocked' | 'unknown'

export type LivenessResult = {
  state: LivenessState
  reason: string
}

const CLOSED_PHRASES: RegExp[] = [
  /no longer (accepting|available|open|active)/i,
  /position (has been|is) (filled|closed)/i,
  /(job|posting|listing|role|position) (has )?(expired|been closed|been removed|is closed)/i,
  /this (job|position|posting) (is )?(no longer|not) (available|open|active|accepting)/i,
  /the job you are looking for is no longer open/i,
  /job (not found|does not exist|doesn'?t exist)/i,
  /(sorry|oops)[^.]{0,40}(couldn'?t|could not) find (anything|that|this|the)/i,
  /the page you are looking for (doesn'?t|does not) exist/i,
  /we('re| are) no longer (hiring|recruiting) for this/i,
  /applications? (are|is|have been) (now )?closed/i,
]

const LIVE_HINTS = /\b(responsibilities|qualifications|requirements|what you('|’)ll do|about the (role|job)|apply (now|for this|today)|submit application)\b/i

const BLOCK_HINTS = /(just a moment|attention required|verify you are human|access denied|enable javascript and cookies|captcha|cf-chl|are you a robot)/i

function pathSegments(url: string): string[] {
  try {
    return new URL(url).pathname.split('/').filter(Boolean)
  } catch {
    return []
  }
}

export function classifyLiveness(input: {
  status: number
  originalUrl: string
  finalUrl?: string
  text: string
}): LivenessResult {
  const { status, originalUrl, text } = input
  const finalUrl = input.finalUrl || originalUrl

  if (status === 404 || status === 410) return { state: 'closed', reason: `page returns ${status}` }

  if (status === 401 || status === 403 || status === 429 || status === 503 || BLOCK_HINTS.test(text.slice(0, 4000))) {
    return { state: 'blocked', reason: status >= 400 ? `site refused the request (${status})` : 'bot check page' }
  }

  if (status >= 500) return { state: 'unknown', reason: `server error ${status}` }

  if (/[?&]error=true\b/i.test(finalUrl) && !/[?&]error=true\b/i.test(originalUrl)) {
    return { state: 'closed', reason: 'redirected to the board with an error' }
  }

  // Posting redirected up to the company's general board.
  try {
    const a = new URL(originalUrl)
    const b = new URL(finalUrl)
    if (a.hostname === b.hostname && pathSegments(originalUrl).length >= 2 && pathSegments(finalUrl).length <= 1) {
      return { state: 'closed', reason: 'redirected to the job board home' }
    }
  } catch {
    /* ignore */
  }

  const hit = CLOSED_PHRASES.find(re => re.test(text))
  if (hit) return { state: 'closed', reason: 'page says the role is closed' }

  if (text.trim().length >= 400 && LIVE_HINTS.test(text)) {
    return { state: 'live', reason: 'posting content and apply text found' }
  }

  return { state: 'unknown', reason: 'could not tell from the page text' }
}

/** Reject non-http(s), localhost, private ranges and internal hostnames. */
export function isSafeFetchTarget(urlString: string): boolean {
  let u: URL
  try {
    u = new URL(urlString)
  } catch {
    return false
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) {
    return false
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return false
    if (a === 169 && b === 254) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    return true
  }
  if (host.includes(':')) return false // raw IPv6 literals
  return true
}

export type FetchedPage = {
  status: number
  finalUrl: string
  html: string
  text: string
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchPage(
  url: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 12_000,
): Promise<FetchedPage | null> {
  if (!isSafeFetchTarget(url)) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; HireIQBot/1.0; +https://hireiq.kingsharif.com)' },
    })
    const finalUrl = res.url || url
    if (!isSafeFetchTarget(finalUrl)) return null
    const html = (await res.text()).slice(0, 1_500_000)
    return { status: res.status, finalUrl, html, text: htmlToText(html) }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
