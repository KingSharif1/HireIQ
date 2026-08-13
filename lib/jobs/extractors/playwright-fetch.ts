import { extractFromHydration } from '@/lib/jobs/extractors/hydration'
import { extractFromHtmlHeuristic } from '@/lib/jobs/extractors/html-heuristic'
import { extractFromJsonLd } from '@/lib/jobs/extractors/json-ld'
import type { ExtractionResult } from '@/lib/jobs/fetch-types'

const DEFAULT_TIMEOUT_MS = 15_000
const CONTENT_WAIT_MS = 4_000

export function isPlaywrightFetchEnabled(): boolean {
  if (process.env.JOB_FETCH_PLAYWRIGHT === '0') return false
  if (process.env.JOB_FETCH_PLAYWRIGHT === '1') return true
  // Local/dev fallback only — avoids ~15s Playwright timeouts on serverless (set JOB_FETCH_PLAYWRIGHT=1 to force).
  return !process.env.VERCEL && process.env.NODE_ENV !== 'test'
}

/**
 * Headless Chromium render for JS-heavy career pages.
 * Only invoked when cheap fetch + parse returns weak content.
 * Gracefully no-ops when Playwright/browser is unavailable (e.g. some serverless).
 */
export async function fetchRenderedHtml(url: string): Promise<string | null> {
  if (!isPlaywrightFetchEnabled()) return null

  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    try {
      const page = await browser.newPage({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT_MS })

      // Wait for common job content markers or a short settle period.
      await Promise.race([
        page.waitForSelector(
          '[class*="job-description"], [class*="description"], #job-description, article, [role="main"]',
          { timeout: CONTENT_WAIT_MS },
        ).catch(() => null),
        page.waitForTimeout(CONTENT_WAIT_MS),
      ])

      return await page.content()
    } finally {
      await browser.close()
    }
  } catch {
    return null
  }
}

export function extractFromRenderedHtml(html: string, url: string): ExtractionResult | null {
  return (
    extractFromJsonLd(html) ||
    extractFromHydration(html, url) ||
    extractFromHtmlHeuristic(html)
  )
}
