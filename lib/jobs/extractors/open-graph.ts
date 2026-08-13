import { load } from 'cheerio'
import type { ExtractionResult } from '@/lib/jobs/fetch-types'

const MIN_OG_DESCRIPTION_CHARS = 200

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function readMeta($: ReturnType<typeof load>, key: string): string {
  const escaped = key.replace(/:/g, '\\:')
  return (
    $(`meta[property="${key}"]`).attr('content')?.trim() ||
    $(`meta[name="${key}"]`).attr('content')?.trim() ||
    $(`meta[property="${escaped}"]`).attr('content')?.trim() ||
    ''
  )
}

/** Extract job text from Open Graph / Twitter meta tags when the description is substantive. */
export function extractFromOpenGraph(html: string): ExtractionResult | null {
  const $ = load(html)

  const description = decodeBasicEntities(readMeta($, 'og:description'))
  if (description.length < MIN_OG_DESCRIPTION_CHARS) return null

  const genericDescriptions = new Set([
    'see all open jobs at microsoft',
    'join us on our mission to empower every person and every organization on the planet to achieve more.',
  ])
  if (genericDescriptions.has(description.toLowerCase())) return null

  const title =
    decodeBasicEntities(readMeta($, 'og:title')) ||
    $('title').first().text().trim()
  const company =
    decodeBasicEntities(readMeta($, 'og:site_name')) ||
    decodeBasicEntities(readMeta($, 'twitter:site')).replace(/^@/, '')

  const text = [title, description].filter(Boolean).join('\n\n').trim()
  if (text.length < MIN_OG_DESCRIPTION_CHARS) return null

  return {
    text,
    title: title.replace(/\s*[|\-–—].*$/, '').trim() || 'Untitled role',
    company,
    method: 'open-graph',
    confidence: description.length >= 500 ? 'high' : 'medium',
  }
}
