import {
  AGGREGATOR_WARNING,
  buildWorkdayApiUrl,
  detectJobUrlKind,
  isLinkedInJobUrl,
  isAggregatorJobUrl,
  parseWorkdayUrl,
  LINKEDIN_PASTE_MESSAGE,
} from '@/lib/jobs/url-detect'

export type JobSource = 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'generic'

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
  const match = url.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/)
  if (!match) throw new Error('Could not parse Greenhouse URL')

  const [, boardToken, jobId] = match
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

async function scrapeGeneric(url: string): Promise<{ text: string; company: string; title: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HireIQ/1.0)' },
  })
  if (!res.ok) throw new Error(`Could not fetch URL (status ${res.status})`)

  const html = await res.text()
  const { load } = await import('cheerio')
  const $ = load(html)

  $('script, style, nav, header, footer, aside, [class*="sidebar"], [class*="nav"]').remove()

  const selectors = [
    '[class*="job-description"]',
    '[class*="job_description"]',
    '[data-testid*="job"]',
    'article',
    '[role="main"]',
    'main',
    '.content',
    '#content',
  ]

  let text = ''
  for (const sel of selectors) {
    const el = $(sel).first()
    if (el.length && el.text().trim().length > 200) {
      text = el.text().replace(/\s+/g, ' ').trim()
      break
    }
  }

  if (!text) {
    text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000)
  }

  const title = $('h1').first().text().trim() || $('title').text().trim()

  return { text: text.slice(0, 8000), company: '', title }
}

export async function scrapeJobUrl(url: string): Promise<{
  text: string
  company: string
  title: string
  source: JobSource
  atsSystem: string
  confidence: 'high' | 'medium' | 'low'
  warning?: string
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

  let result: { text: string; company: string; title: string }

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
    default:
      result = await scrapeGeneric(url)
  }

  if (result.text.trim().length < 100 && source === 'generic') {
    throw new Error('Could not extract enough job content from this URL — paste the description instead')
  }

  return {
    ...result,
    source,
    atsSystem: source === 'generic' ? '' : source,
    confidence: warning ? 'medium' : confidence,
    warning,
  }
}
