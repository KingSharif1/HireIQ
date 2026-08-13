import { assertSavableJobUrl } from '@/lib/extension/job-page'
import { detectJobUrlKind } from '@/lib/jobs/url-detect'

const RAW_URL = /https?:\/\/[^\s<>"'\\]+/gi
const HREF_URL = /href\s*=\s*["']([^"']+)["']/gi
const SKIP =
  /unsubscribe|mailto:|schema\.org|gravatar|facebook\.com\/sharer|twitter\.com\/intent|linkedin\.com\/sharing|fonts\.google|w3\.org/i

const ATS_KIND = new Set(['greenhouse', 'lever', 'ashby', 'workday', 'amazon', 'microsoft'])

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripTrailingJunk(url: string): string {
  return url.replace(/[),.;\]>]+$/g, '')
}

function unwrapRedirect(url: string): string {
  try {
    const parsed = new URL(url)
    const nested =
      parsed.searchParams.get('q') ||
      parsed.searchParams.get('u') ||
      parsed.searchParams.get('url') ||
      parsed.searchParams.get('target')
    if (nested && /^https?:\/\//i.test(nested)) return nested
  } catch {
    // keep original
  }
  return url
}

function collectRaw(text: string): string[] {
  const out: string[] = []
  const decoded = decodeEntities(text)
  for (const match of decoded.matchAll(RAW_URL)) {
    if (match[0]) out.push(match[0])
  }
  for (const match of decoded.matchAll(HREF_URL)) {
    if (match[1]) out.push(match[1])
  }
  return out
}

export function extractUrlsFromEmail(text?: string | null, html?: string | null): string[] {
  const seen = new Set<string>()
  const urls: string[] = []
  for (const raw of [...collectRaw(text || ''), ...collectRaw(html || '')]) {
    const cleaned = unwrapRedirect(stripTrailingJunk(decodeEntities(raw).trim()))
    if (!cleaned.startsWith('http')) continue
    if (SKIP.test(cleaned)) continue
    if (seen.has(cleaned)) continue
    seen.add(cleaned)
    urls.push(cleaned)
  }
  return urls
}

function rankUrl(url: string): number {
  const kind = detectJobUrlKind(url)
  if (ATS_KIND.has(kind)) return 0
  if (kind === 'aggregator') return 2
  if (kind === 'linkedin') return 3
  return 1
}

/** First savable job URL, preferring ATS hosts over generic career pages. */
export function pickSavableJobUrl(urls: string[]): string | null {
  const savable = urls
    .filter(url => !assertSavableJobUrl(url))
    .sort((a, b) => rankUrl(a) - rankUrl(b))
  return savable[0] ?? null
}

export function extractSavableJobUrl(text?: string | null, html?: string | null): string | null {
  return pickSavableJobUrl(extractUrlsFromEmail(text, html))
}
