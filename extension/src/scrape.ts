export type ScrapedJob = {
  url: string
  title: string
  company: string
  description: string
  location: string
}

const CHROME_NOISE =
  /\b(back to jobs|create a job alert|quick apply|mygreenhouse|cookie|privacy policy|equal opportunity|eeo)\b/gi

function companyFromTitle(title: string, pageTitle: string): string {
  // Greenhouse often uses "Role at Company" in document.title
  const fromDoc = pageTitle.match(/\bat\s+(.+)$/i)
  if (fromDoc?.[1]) return fromDoc[1].replace(/\s*[|\-–—].*$/, '').trim()
  const fromOg = title.match(/\bat\s+(.+)$/i)
  if (fromOg?.[1]) return fromOg[1].trim()
  return ''
}

function extractDescription(doc: Document): string {
  const selectors = [
    '#content',
    '.job__description',
    '.job-post-content',
    '[data-qa="job-description"]',
    '.posting-page',
    '.posting',
    '[class*="JobDescription"]',
    '[data-job-description]',
    '.job-description',
    '#job-description',
    'div#app_body',
    'article',
  ]

  let root: Element | null = null
  for (const sel of selectors) {
    const el = doc.querySelector(sel)
    if (el && (el.textContent || '').trim().length > 80) {
      root = el
      break
    }
  }
  if (!root) root = doc.querySelector('main') || doc.body

  // Prefer cloning and removing obvious chrome
  const clone = root.cloneNode(true) as HTMLElement
  clone
    .querySelectorAll(
      'nav, header, footer, script, style, noscript, iframe, button, form, [class*="cookie"], [class*="alert"]',
    )
    .forEach(n => n.remove())

  const blocks: string[] = []
  const push = (t: string) => {
    const cleaned = t.replace(CHROME_NOISE, ' ').replace(/[ \t]+/g, ' ').trim()
    if (cleaned.length > 2) blocks.push(cleaned)
  }

  const paras = clone.querySelectorAll('p, li, h1, h2, h3, h4, section')
  if (paras.length > 3) {
    paras.forEach(el => push(el.textContent || ''))
  } else {
    const raw = (clone.innerText || clone.textContent || '').replace(/\r\n?/g, '\n')
    raw.split(/\n+/).forEach(push)
  }

  // Deduplicate consecutive identical lines
  const out: string[] = []
  for (const line of blocks) {
    if (out[out.length - 1] === line) continue
    // Drop short nav crumbs
    if (/^(apply|back|jobs?|careers?)$/i.test(line)) continue
    out.push(line)
  }

  return out.join('\n\n').slice(0, 20000)
}

/** Best-effort scrape of common job page patterns. Runs in page context. */
export function scrapeJobFromDocument(doc: Document = document): ScrapedJob {
  const pageUrl = typeof location !== 'undefined' ? location.href : ''
  const url = pageUrl

  const ogTitle =
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || ''
  const h1 = doc.querySelector('h1')?.textContent?.trim() || ''
  const pageTitle = doc.title || ''
  let title =
    h1 ||
    ogTitle ||
    pageTitle.replace(/\s*[|\-–—].*$/, '').trim() ||
    'Untitled role'
  // Strip " at Company" from title when present
  title = title.replace(/\s+at\s+.+$/i, '').trim() || title

  const company =
    doc.querySelector('[data-company], .company, .employer, [class*="companyName"]')?.textContent?.trim() ||
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() ||
    companyFromTitle(ogTitle || h1, pageTitle) ||
    ''

  const jobLocation =
    doc.querySelector(
      '[data-location], .location, [class*="jobLocation"], .job__location, .app-location',
    )?.textContent?.trim() || ''

  let description = extractDescription(doc)
  if (description.length < 40) {
    description = `Saved from ${url}`
  }

  return {
    url,
    title: title.slice(0, 500),
    company: company.slice(0, 500),
    description,
    location: jobLocation.slice(0, 500),
  }
}
