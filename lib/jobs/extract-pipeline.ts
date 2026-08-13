import { extractFromHydration } from '@/lib/jobs/extractors/hydration'
import { extractFromHtmlHeuristic } from '@/lib/jobs/extractors/html-heuristic'
import { extractFromJsonLd } from '@/lib/jobs/extractors/json-ld'
import {
  extractFromRenderedHtml,
  fetchRenderedHtml,
  isPlaywrightFetchEnabled,
} from '@/lib/jobs/extractors/playwright-fetch'
import {
  MIN_USABLE_DESCRIPTION_CHARS,
  PLAYWRIGHT_FALLBACK_THRESHOLD,
  type ExtractionResult,
  type FetchAttempt,
  type HtmlExtractionOutcome,
} from '@/lib/jobs/fetch-types'

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
}

function score(result: ExtractionResult): number {
  let s = result.text.length
  if (result.confidence === 'high') s += 500
  else if (result.confidence === 'medium') s += 200
  if (result.method === 'json-ld' || result.method === 'hydration-json') s += 300
  return s
}

function pickBest(candidates: ExtractionResult[]): ExtractionResult | null {
  if (!candidates.length) return null
  return candidates.reduce((best, cur) => (score(cur) > score(best) ? cur : best))
}

async function runFastExtractors(
  html: string,
  url: string,
): Promise<{ result: ExtractionResult | null; attempts: FetchAttempt[] }> {
  const attempts: FetchAttempt[] = []
  const candidates: ExtractionResult[] = []

  const steps: Array<{ method: ExtractionResult['method']; run: () => ExtractionResult | null }> = [
    { method: 'json-ld', run: () => extractFromJsonLd(html) },
    { method: 'hydration-json', run: () => extractFromHydration(html, url) },
    { method: 'html-heuristic', run: () => extractFromHtmlHeuristic(html) },
  ]

  for (const step of steps) {
    const started = Date.now()
    try {
      const hit = step.run()
      attempts.push({
        method: step.method,
        ruleId: hit?.ruleId,
        success: Boolean(hit && hit.text.length >= MIN_USABLE_DESCRIPTION_CHARS),
        textLength: hit?.text.length ?? 0,
        durationMs: Date.now() - started,
      })
      if (hit) candidates.push(hit)
    } catch (err) {
      attempts.push({
        method: step.method,
        success: false,
        textLength: 0,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : 'extract failed',
      })
    }
  }

  return { result: pickBest(candidates), attempts }
}

export async function extractJobFromHtmlUrl(url: string): Promise<HtmlExtractionOutcome> {
  const attempts: FetchAttempt[] = []

  const fetchStarted = Date.now()
  const res = await fetch(url, { headers: FETCH_HEADERS })
  if (!res.ok) {
    throw new Error(`Could not fetch URL (status ${res.status})`)
  }
  const html = await res.text()
  attempts.push({
    method: 'html-heuristic',
    success: true,
    textLength: html.length,
    durationMs: Date.now() - fetchStarted,
  })

  const fast = await runFastExtractors(html, url)
  attempts.push(...fast.attempts)

  let best = fast.result
  const needsPlaywright =
    isPlaywrightFetchEnabled() &&
    (!best || best.text.length < PLAYWRIGHT_FALLBACK_THRESHOLD)

  if (needsPlaywright) {
    const pwStarted = Date.now()
    const rendered = await fetchRenderedHtml(url)
    if (rendered) {
      const renderedHit = extractFromRenderedHtml(rendered, url)
      attempts.push({
        method: 'playwright',
        success: Boolean(renderedHit && renderedHit.text.length >= MIN_USABLE_DESCRIPTION_CHARS),
        textLength: renderedHit?.text.length ?? 0,
        durationMs: Date.now() - pwStarted,
      })
      if (renderedHit && (!best || score(renderedHit) > score(best))) {
        best = { ...renderedHit, method: 'playwright' }
      }
    } else {
      attempts.push({
        method: 'playwright',
        success: false,
        textLength: 0,
        durationMs: Date.now() - pwStarted,
        error: 'Playwright unavailable or timed out',
      })
    }
  }

  return { result: best, attempts }
}
