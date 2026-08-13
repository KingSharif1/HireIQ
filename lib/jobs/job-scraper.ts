import {
  AGGREGATOR_WARNING,
  buildWorkdayApiUrl,
  detectJobUrlKind,
  isLinkedInJobUrl,
  isAggregatorJobUrl,
  parseWorkdayUrl,
  parseGreenhouseUrl,
  LINKEDIN_PASTE_MESSAGE,
} from '@/lib/jobs/url-detect'

export type JobSource =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workday'
  | 'amazon'
  | 'microsoft'
  | 'generic'

export class LinkedInBlockedError extends Error {
  readonly code = 'LINKEDIN_BLOCKED' as const

  constructor(message = LINKEDIN_PASTE_MESSAGE) {
    super(message)
    this.name = 'LinkedInBlockedError'
  }
}

function detectSource(url: string): JobSource {
  const kind = detectJobUrlKind(url)
  if (kind === 'workday') return 'workday'
  if (kind === 'greenhouse') return 'greenhouse'
  if (kind === 'lever') return 'lever'
  if (kind === 'ashby') return 'ashby'
  if (kind === 'amazon') return 'amazon'
  if (kind === 'microsoft') return 'microsoft'
  return 'generic'
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function scrapeWorkday(url: string): Promise<{ text: string; company: string; title: string }> {
  const parts = parseWorkdayUrl(url)
  if (!parts) throw new Error('Could not parse Workday URL')

  const apiUrl = buildWorkdayApiUrl(parts)
  const res = await fetch(apiUrl, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'HireIQ/1.0',
    },
  })
  if (!res.ok) throw new Error('Failed to fetch Workday job — try pasting the description instead')

  const data = await res.json() as {
    jobPostingInfo?: {
      title?: string
      location?: string
      jobDescription?: string
      company?: { descriptor?: string }
    }
    title?: string
    jobDescription?: string
    location?: string
  }

  const info = data.jobPostingInfo ?? data
  const title = info.title ?? ''
  const location = 'location' in info && info.location ? `\n${info.location}` : ''
  const description = info.jobDescription ?? data.jobDescription ?? ''
  const text = stripHtml(description)
  const company = data.jobPostingInfo?.company?.descriptor ?? parts.tenant

  if (!text || text.length < 50) {
    throw new Error('Workday returned empty content — paste the job description instead')
  }

  return {
    text: `${title}${location}\n\n${text}`,
    company,
    title,
  }
}

async function scrapeGreenhouse(url: string): Promise<{ text: string; company: string; title: string }> {
  const parsed = parseGreenhouseUrl(url)
  if (!parsed) throw new Error('Could not parse Greenhouse URL')

  const { boardToken, jobId } = parsed
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}`
  const res = await fetch(apiUrl, { headers: { 'User-Agent': 'HireIQ/1.0' } })
  if (!res.ok) throw new Error('Failed to fetch Greenhouse job')

  const data = await res.json()
  const rawHtml = data.content || ''
  const text = stripHtml(rawHtml)

  return {
    text: `${data.title}\n\n${text}`,
    company: boardToken,
    title: data.title || '',
  }
}

async function scrapeLever(url: string): Promise<{ text: string; company: string; title: string }> {
  const match = url.match(/lever\.co\/([^/]+)\/([a-f0-9-]{36})/)
  if (!match) throw new Error('Could not parse Lever URL')

  const [, company, postingId] = match
  const apiUrl = `https://api.lever.co/v0/postings/${company}/${postingId}`
  const res = await fetch(apiUrl, { headers: { 'User-Agent': 'HireIQ/1.0' } })
  if (!res.ok) throw new Error('Failed to fetch Lever job')

  const data = await res.json()
  const lists = (data.lists || []).map((l: { text: string; content: string }) => `${l.text}\n${stripHtml(l.content)}`).join('\n\n')
  const text = `${data.text}\n\n${data.descriptionPlain || ''}\n\n${lists}`

  return {
    text,
    company: data.categories?.team || company,
    title: data.text || '',
  }
}

async function scrapeAshby(url: string): Promise<{ text: string; company: string; title: string }> {
  const cleanUrl = url.split('?')[0]
  const match = cleanUrl.match(/ashbyhq\.com\/([^/]+)\/([^/?]+)/)
  if (!match) throw new Error('Could not parse Ashby URL')

  const [, company, jobId] = match
  const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${company}`
  const res = await fetch(apiUrl, { headers: { 'User-Agent': 'HireIQ/1.0' } })
  if (!res.ok) throw new Error('Failed to fetch Ashby board')

  const data = await res.json() as {
    jobs?: Array<{
      id: string
      title: string
      descriptionPlain?: string
      descriptionHtml?: string
      jobUrl?: string
    }>
    jobPostings?: Array<{
      id: string
      title: string
      descriptionPlain?: string
      description?: string
    }>
  }

  const postings = data.jobs ?? data.jobPostings ?? []
  const job = postings.find(
    j => j.id === jobId || cleanUrl.includes(j.id) || ('jobUrl' in j && j.jobUrl?.includes(jobId))
  )
  if (!job) throw new Error('Job not found on Ashby board')

  const plain = job.descriptionPlain
    ?? ('description' in job ? job.description : undefined)
    ?? ('descriptionHtml' in job && job.descriptionHtml
      ? stripHtml(job.descriptionHtml)
      : '')

  return {
    text: `${job.title}\n\n${plain}`,
    company,
    title: job.title || '',
  }
}

async function scrapeGeneric(url: string): Promise<{
  text: string
  company: string
  title: string
  extractionMethod?: string
  extractionRuleId?: string
}> {
  const { extractJobFromHtmlUrl } = await import('@/lib/jobs/extract-pipeline')
  const { result } = await extractJobFromHtmlUrl(url)
  if (!result) {
    return { text: '', company: '', title: '' }
  }

  return {
    text: result.text.slice(0, 8000),
    company: result.company,
    title: result.title,
    extractionMethod: result.method,
    extractionRuleId: result.ruleId,
  }
}

async function scrapeAmazon(url: string): Promise<{
  text: string
  company: string
  title: string
  extractionMethod?: string
}> {
  const { extractFromOpenGraph } = await import('@/lib/jobs/extractors/open-graph')
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (res.ok) {
    const html = await res.text()
    const og = extractFromOpenGraph(html)
    if (og && og.text.length >= 100) {
      return {
        text: og.text.slice(0, 8000),
        company: og.company || 'Amazon',
        title: og.title,
        extractionMethod: og.method,
      }
    }
  }

  const generic = await scrapeGeneric(url)
  if (generic.text.length >= 100) {
    return { ...generic, company: generic.company || 'Amazon' }
  }
  throw new Error('Could not extract Amazon job content — paste the description instead')
}

async function scrapeMicrosoft(url: string): Promise<{
  text: string
  company: string
  title: string
  extractionMethod?: string
  extractionRuleId?: string
}> {
  const { parseMicrosoftCareersUrl } = await import('@/lib/jobs/url-detect')
  const {
    fetchMicrosoftPosition,
    resolveMicrosoftPositionId,
  } = await import('@/lib/jobs/extractors/microsoft-eightfold')

  const parsed = parseMicrosoftCareersUrl(url)
  if (!parsed) throw new Error('Could not parse Microsoft careers URL')

  let positionId = parsed.positionId
  if (!positionId && parsed.legacyJobId) {
    positionId = (await resolveMicrosoftPositionId(url)) ?? undefined
  }

  if (!positionId) {
    throw new Error(
      'Could not resolve this Microsoft careers link — try the apply.careers.microsoft.com URL or paste the description',
    )
  }

  const result = await fetchMicrosoftPosition(positionId)
  if (!result) {
    throw new Error('Microsoft careers API returned no job content — paste the description instead')
  }

  return {
    text: result.text,
    company: result.company,
    title: result.title,
    extractionMethod: result.method,
    extractionRuleId: result.ruleId,
  }
}

export async function scrapeJobUrl(url: string): Promise<{
  text: string
  company: string
  title: string
  source: JobSource
  atsSystem: string
  confidence: 'high' | 'medium' | 'low'
  warning?: string
  extractionMethod?: string
  extractionRuleId?: string
}> {
  if (isLinkedInJobUrl(url)) {
    throw new LinkedInBlockedError()
  }

  const source = detectSource(url)
  const confidence = source === 'generic' ? 'low' : 'high'
  let warning: string | undefined

  if (isAggregatorJobUrl(url)) {
    warning = AGGREGATOR_WARNING
  }

  let result: {
    text: string
    company: string
    title: string
    extractionMethod?: string
    extractionRuleId?: string
  }

  switch (source) {
    case 'workday':
      result = await scrapeWorkday(url)
      break
    case 'greenhouse':
      result = await scrapeGreenhouse(url)
      break
    case 'lever':
      result = await scrapeLever(url)
      break
    case 'ashby':
      result = await scrapeAshby(url)
      break
    case 'amazon':
      result = await scrapeAmazon(url)
      break
    case 'microsoft':
      result = await scrapeMicrosoft(url)
      break
    default:
      result = await scrapeGeneric(url)
  }

  if (result.text.trim().length < 100 && (source === 'generic' || source === 'amazon')) {
    throw new Error('Could not extract enough job content from this URL — paste the description instead')
  }

  const genericMeta =
    source === 'generic' && 'extractionMethod' in result
      ? {
          extractionMethod: result.extractionMethod,
          extractionRuleId: result.extractionRuleId,
        }
      : {}

  const genericConfidence =
    source === 'generic' && 'extractionMethod' in result
      ? result.extractionMethod === 'html-heuristic' && result.text.length < 500
        ? 'low'
        : result.extractionMethod === 'playwright'
          ? 'medium'
          : 'high'
      : confidence

  return {
    ...result,
    source,
    atsSystem: source === 'generic' ? '' : source,
    confidence: warning ? 'medium' : genericConfidence,
    warning,
    ...genericMeta,
  }
}
