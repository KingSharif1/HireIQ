export type JobSource = 'greenhouse' | 'lever' | 'ashby' | 'generic'

function detectSource(url: string): JobSource {
  if (url.includes('greenhouse.io')) return 'greenhouse'
  if (url.includes('lever.co')) return 'lever'
  if (url.includes('ashbyhq.com')) return 'ashby'
  return 'generic'
}

async function scrapeGreenhouse(url: string): Promise<{ text: string; company: string; title: string }> {
  // Parse: https://boards.greenhouse.io/{company}/jobs/{id}
  const match = url.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/)
  if (!match) throw new Error('Could not parse Greenhouse URL')

  const [, boardToken, jobId] = match
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}`
  const res = await fetch(apiUrl, { headers: { 'User-Agent': 'HireIQ/1.0' } })
  if (!res.ok) throw new Error('Failed to fetch Greenhouse job')

  const data = await res.json()
  const rawHtml = data.content || ''
  const text = rawHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  return {
    text: `${data.title}\n\n${text}`,
    company: boardToken,
    title: data.title || '',
  }
}

async function scrapeLever(url: string): Promise<{ text: string; company: string; title: string }> {
  // Parse: https://jobs.lever.co/{company}/{postingId}
  const match = url.match(/lever\.co\/([^/]+)\/([a-f0-9-]{36})/)
  if (!match) throw new Error('Could not parse Lever URL')

  const [, company, postingId] = match
  const apiUrl = `https://api.lever.co/v0/postings/${company}/${postingId}`
  const res = await fetch(apiUrl, { headers: { 'User-Agent': 'HireIQ/1.0' } })
  if (!res.ok) throw new Error('Failed to fetch Lever job')

  const data = await res.json()
  const lists = (data.lists || []).map((l: { text: string; content: string }) => `${l.text}\n${l.content.replace(/<[^>]+>/g, ' ')}`).join('\n\n')
  const text = `${data.text}\n\n${data.descriptionPlain || ''}\n\n${lists}`

  return {
    text,
    company: data.categories?.team || company,
    title: data.text || '',
  }
}

async function scrapeAshby(url: string): Promise<{ text: string; company: string; title: string }> {
  // Parse: https://{company}.ashbyhq.com/job/{id} or https://jobs.ashbyhq.com/{company}/{id}
  const match = url.match(/ashbyhq\.com\/([^/]+)\/([^/?]+)/)
  if (!match) throw new Error('Could not parse Ashby URL')

  const [, company, jobId] = match
  const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${company}`
  const res = await fetch(apiUrl, { headers: { 'User-Agent': 'HireIQ/1.0' } })
  if (!res.ok) throw new Error('Failed to fetch Ashby board')

  const data = await res.json()
  const job = (data.jobPostings || []).find((j: { id: string; title: string; descriptionPlain: string }) => j.id === jobId || url.includes(j.id))
  if (!job) throw new Error('Job not found on Ashby board')

  return {
    text: `${job.title}\n\n${job.descriptionPlain || job.description || ''}`,
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

  // Remove noise
  $('script, style, nav, header, footer, aside, [class*="sidebar"], [class*="nav"]').remove()

  // Try to find job content in priority order
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
}> {
  const source = detectSource(url)

  let result: { text: string; company: string; title: string }

  switch (source) {
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

  return {
    ...result,
    source,
    atsSystem: source === 'generic' ? '' : source,
  }
}
