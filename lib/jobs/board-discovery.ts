/**
 * Employer-board discovery — pull a company's live postings straight from its
 * public ATS board API instead of scraping the careers page one job at a time.
 *
 * Supported (all public, no auth):
 *  - Greenhouse  https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
 *  - Lever       https://api.lever.co/v0/postings/{token}?mode=json
 *  - Ashby       https://api.ashbyhq.com/posting-api/job-board/{token}
 *
 * Parsing is pure and fixture-tested; `fetchBoardPostings` is the only I/O.
 */

export type BoardProvider = 'greenhouse' | 'lever' | 'ashby'

export interface BoardEndpoint {
  provider: BoardProvider
  token: string
  url: string
}

export interface DiscoveredPosting {
  provider: BoardProvider
  externalId: string
  title: string
  company: string
  location: string | null
  remoteType: string | null
  applyUrl: string
  description: string
  postedAt: string | null
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
}

/** Cheap HTML→text: board APIs return HTML in the description fields. */
export function htmlToText(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function detectRemoteType(...signals: Array<string | null | undefined>): string | null {
  const haystack = signals.filter(Boolean).join(' ').toLowerCase()
  if (!haystack) return null
  if (/\bremote\b|\banywhere\b|distributed/.test(haystack)) return 'remote'
  if (/\bhybrid\b/.test(haystack)) return 'hybrid'
  if (/\bon[- ]?site\b|\bin[- ]office\b/.test(haystack)) return 'onsite'
  return null
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * Accepts a board URL or a `provider:token` pair:
 *   https://job-boards.greenhouse.io/acme
 *   https://boards.greenhouse.io/acme?...
 *   https://jobs.lever.co/acme
 *   https://jobs.ashbyhq.com/acme
 *   greenhouse:acme · lever:acme · ashby:acme
 */
export function parseBoardInput(input: string): BoardEndpoint | null {
  const raw = input.trim()
  if (!raw) return null

  const prefixed = raw.match(/^(greenhouse|lever|ashby)\s*[:/]\s*([A-Za-z0-9_-]+)$/i)
  if (prefixed) {
    return endpointFor(prefixed[1].toLowerCase() as BoardProvider, prefixed[2])
  }

  let url: URL
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  const segments = url.pathname.split('/').filter(Boolean)
  const token = segments[0]
  if (!token) return null

  if (host.endsWith('greenhouse.io')) {
    // Job URLs look like /{token}/jobs/{id}; board URLs are /{token}.
    return endpointFor('greenhouse', token)
  }
  if (host === 'jobs.lever.co' || host.endsWith('.lever.co')) {
    return endpointFor('lever', token)
  }
  if (host.endsWith('ashbyhq.com')) {
    return endpointFor('ashby', token)
  }
  return null
}

export function endpointFor(provider: BoardProvider, token: string): BoardEndpoint {
  const clean = token.trim()
  switch (provider) {
    case 'greenhouse':
      return {
        provider,
        token: clean,
        url: `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(clean)}/jobs?content=true`,
      }
    case 'lever':
      return {
        provider,
        token: clean,
        url: `https://api.lever.co/v0/postings/${encodeURIComponent(clean)}?mode=json`,
      }
    case 'ashby':
      return {
        provider,
        token: clean,
        url: `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(clean)}?includeCompensation=false`,
      }
  }
}

export function parseGreenhouseBoard(json: unknown, fallbackCompany = ''): DiscoveredPosting[] {
  const jobs = list(record(json).jobs)
  return jobs.flatMap((entry) => {
    const job = record(entry)
    const title = str(job.title).trim()
    const applyUrl = str(job.absolute_url).trim()
    if (!title || !applyUrl) return []
    const location = str(record(job.location).name).trim() || null
    return [
      {
        provider: 'greenhouse' as const,
        externalId: String(job.id ?? applyUrl),
        title,
        company: str(job.company_name).trim() || fallbackCompany,
        location,
        remoteType: detectRemoteType(location, title),
        applyUrl,
        description: htmlToText(str(job.content)),
        postedAt: str(job.updated_at).trim() || null,
      },
    ]
  })
}

export function parseLeverBoard(json: unknown, fallbackCompany = ''): DiscoveredPosting[] {
  return list(json).flatMap((entry) => {
    const job = record(entry)
    const title = str(job.text).trim()
    const applyUrl = str(job.hostedUrl).trim()
    if (!title || !applyUrl) return []
    const categories = record(job.categories)
    const location = str(categories.location).trim() || null
    return [
      {
        provider: 'lever' as const,
        externalId: String(job.id ?? applyUrl),
        title,
        company: str(job.company).trim() || fallbackCompany,
        location,
        remoteType: detectRemoteType(location, title, str(categories.commitment)),
        applyUrl,
        description: htmlToText(str(job.descriptionPlain) || str(job.description)),
        postedAt: str(job.createdAt).trim() || null,
      },
    ]
  })
}

export function parseAshbyBoard(json: unknown, fallbackCompany = ''): DiscoveredPosting[] {
  const jobs = list(record(json).jobs)
  return jobs.flatMap((entry) => {
    const job = record(entry)
    const title = str(job.title).trim()
    const applyUrl = (str(job.jobUrl) || str(job.applyUrl)).trim()
    if (!title || !applyUrl) return []
    const location = str(job.location).trim() || null
    const remoteFlag = job.isRemote === true
    return [
      {
        provider: 'ashby' as const,
        externalId: String(job.id ?? applyUrl),
        title,
        company: fallbackCompany,
        location,
        remoteType: remoteFlag ? 'remote' : detectRemoteType(location, title, str(job.employmentType)),
        applyUrl,
        description: htmlToText(str(job.descriptionPlain) || str(job.descriptionHtml)),
        postedAt: str(job.publishedAt).trim() || null,
      },
    ]
  })
}

export function parseBoard(
  provider: BoardProvider,
  json: unknown,
  opts: { token: string; company?: string },
): DiscoveredPosting[] {
  const fallback = (opts.company ?? opts.token).trim()
  switch (provider) {
    case 'greenhouse':
      return parseGreenhouseBoard(json, fallback)
    case 'lever':
      return parseLeverBoard(json, fallback)
    case 'ashby':
      return parseAshbyBoard(json, fallback)
  }
}

export function dedupePostings(postings: readonly DiscoveredPosting[]): DiscoveredPosting[] {
  const seen = new Set<string>()
  const out: DiscoveredPosting[] = []
  for (const posting of postings) {
    const key = posting.applyUrl.trim().toLowerCase().replace(/\/$/, '')
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(posting)
  }
  return out
}

export interface FetchBoardOptions {
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

export async function fetchBoardPostings(
  endpoint: BoardEndpoint,
  opts: FetchBoardOptions = {},
): Promise<DiscoveredPosting[]> {
  const doFetch = opts.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000)
  try {
    const res = await doFetch(endpoint.url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`Board ${endpoint.provider}:${endpoint.token} returned HTTP ${res.status}`)
    }
    const json: unknown = await res.json()
    return dedupePostings(parseBoard(endpoint.provider, json, { token: endpoint.token }))
  } finally {
    clearTimeout(timer)
  }
}
