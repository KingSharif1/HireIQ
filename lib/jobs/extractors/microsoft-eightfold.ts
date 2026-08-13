import { isPlaywrightFetchEnabled } from '@/lib/jobs/extractors/playwright-fetch'
import type { ExtractionResult } from '@/lib/jobs/fetch-types'

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://apply.careers.microsoft.com/',
}

type MicrosoftPositionPayload = {
  id?: number | string
  name?: string
  jobDescription?: string
  department?: string
  locations?: string[]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function toResult(data: MicrosoftPositionPayload): ExtractionResult | null {
  const title = data.name?.trim() || ''
  const description = stripHtml(data.jobDescription ?? '')
  const location = Array.isArray(data.locations) ? data.locations.filter(Boolean).join('; ') : ''
  const parts = [title, location, description].filter(Boolean)
  const text = parts.join('\n\n').trim()

  if (text.length < 100) return null

  return {
    text: text.slice(0, 8000),
    title: title || 'Untitled role',
    company: 'Microsoft',
    method: 'ats-api',
    confidence: description.length >= 500 ? 'high' : 'medium',
    ruleId: 'microsoft-eightfold-pcsx',
  }
}

async function fetchPcsxPosition(positionId: string): Promise<ExtractionResult | null> {
  const apiUrl = `https://apply.careers.microsoft.com/api/pcsx/position_details?position_id=${encodeURIComponent(positionId)}&domain=microsoft.com&hl=en`
  const res = await fetch(apiUrl, { headers: FETCH_HEADERS })
  if (!res.ok) return null

  const payload = (await res.json()) as {
    status?: number
    data?: MicrosoftPositionPayload
  }
  if (payload.status !== 200 || !payload.data) return null
  return toResult(payload.data)
}

async function fetchApplyV2Position(positionId: string): Promise<ExtractionResult | null> {
  const apiUrl = `https://apply.careers.microsoft.com/api/apply/v2/jobs/${encodeURIComponent(positionId)}?domain=microsoft.com`
  const res = await fetch(apiUrl, { headers: FETCH_HEADERS })
  if (!res.ok) return null

  const payload = (await res.json()) as {
    message?: string
    name?: string
    job_description?: string
    department?: string
    location?: string
    locations?: string[]
  }
  if (payload.message) return null

  return toResult({
    name: payload.name,
    jobDescription: payload.job_description,
    department: payload.department,
    locations: payload.locations ?? (payload.location ? [payload.location] : []),
  })
}

export async function fetchMicrosoftPosition(positionId: string): Promise<ExtractionResult | null> {
  return (await fetchPcsxPosition(positionId)) ?? (await fetchApplyV2Position(positionId))
}

/** Legacy jobs.careers URLs redirect client-side to apply.careers with a `pid` query param. */
export async function resolveMicrosoftPositionId(url: string): Promise<string | null> {
  if (!isPlaywrightFetchEnabled()) return null

  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    try {
      const page = await browser.newPage({
        userAgent: FETCH_HEADERS['User-Agent'],
      })
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      await page.waitForTimeout(2_500)

      const finalUrl = page.url()
      const pid = new URL(finalUrl).searchParams.get('pid')
      if (pid && /^\d{10,}$/.test(pid)) return pid

      const match = finalUrl.match(/[?&]pid=(\d{10,})/)
      return match?.[1] ?? null
    } finally {
      await browser.close()
    }
  } catch {
    return null
  }
}
