import { load } from 'cheerio'
import type { ExtractionResult } from '@/lib/jobs/fetch-types'

const CONTENT_SELECTORS = [
  '[class*="job-description"]',
  '[class*="job_description"]',
  '[data-testid*="job"]',
  '[data-qa="job-description"]',
  '.job__description',
  '.job-post-content',
  '#job-description',
  '.job-description',
  'article',
  '[role="main"]',
  'main',
  '.content',
  '#content',
]

/** Cheerio-based extraction for static/SSR HTML. */
export function extractFromHtmlHeuristic(html: string): ExtractionResult | null {
  const $ = load(html)

  $('script, style, nav, header, footer, aside, [class*="sidebar"], [class*="nav"]').remove()

  let text = ''
  for (const sel of CONTENT_SELECTORS) {
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
  const company =
    $('meta[property="og:site_name"]').attr('content')?.trim() ||
    $('[data-company], .company, .employer').first().text().trim() ||
    ''

  const trimmed = text.slice(0, 8000).trim()
  if (trimmed.length < 80) return null

  return {
    text: trimmed,
    title: title.replace(/\s*[|\-–—].*$/, '').trim() || 'Untitled role',
    company,
    method: 'html-heuristic',
    confidence: trimmed.length >= 500 ? 'medium' : 'low',
  }
}
