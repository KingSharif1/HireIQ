export type ScrapedJob = {
  url: string
  title: string
  company: string
  description: string
  location: string
}

/** Best-effort scrape of common job page patterns. Runs in page context. */
export function scrapeJobFromDocument(doc: Document = document): ScrapedJob {
  const pageUrl = typeof location !== 'undefined' ? location.href : ''
  const url = pageUrl

  const ogTitle =
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || ''
  const title =
    ogTitle ||
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.title.replace(/\s*[|\-–—].*$/, '').trim() ||
    'Untitled role'

  const company =
    doc.querySelector('[data-company], .company, .employer, [class*="companyName"]')?.textContent?.trim() ||
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() ||
    ''

  const jobLocation =
    doc.querySelector('[data-location], .location, [class*="jobLocation"]')?.textContent?.trim() ||
    ''

  const main =
    doc.querySelector(
      '[data-job-description], .job-description, #job-description, [class*="description"], article, main'
    ) || doc.body

  let description = (main?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20000)

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
