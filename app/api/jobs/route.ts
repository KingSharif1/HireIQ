import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveExtensionUserId } from '@/lib/extension/tokens'
import { assertSavableJobUrl } from '@/lib/extension/job-page'
import { normalizeApplyUrl } from '@/lib/extension/normalize-url'
import { normalizeJobDescription } from '@/lib/jobs/description'
import { scrapeJobUrl } from '@/lib/jobs/job-scraper'
import { detectJobUrlKind } from '@/lib/jobs/url-detect'

export const runtime = 'nodejs'

const MAX_DESCRIPTION = 50_000
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    origin && (origin.startsWith('chrome-extension://') || origin === 'http://localhost:3000')
      ? origin
      : 'chrome-extension://*'
  return {
    'Access-Control-Allow-Origin': allow === 'chrome-extension://*' ? '*' : allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function isScrapableAtsUrl(url: string): boolean {
  const kind = detectJobUrlKind(url)
  return kind === 'greenhouse' || kind === 'lever' || kind === 'ashby' || kind === 'workday'
}

function startsWithChromeNoise(text: string): boolean {
  return /^(back to jobs|create a job alert|quick apply|mygreenhouse)/i.test(text.trimStart())
}

/** Existing body text looks like glued Greenhouse chrome junk. */
function isGluedChromeJunk(text: string): boolean {
  return text.includes('Back to jobs') && !text.includes('\n')
}

function isBetterScrapedDescription(scraped: string, current: string): boolean {
  const scrapedTrim = scraped.trim()
  if (!scrapedTrim) return false
  if (scrapedTrim.length <= current.trim().length) return false
  if (startsWithChromeNoise(scrapedTrim)) return false
  return true
}

function buildExtractedData(opts: {
  title: string
  company: string
  description: string
  atsSystem?: string
}) {
  const cleaned = normalizeJobDescription(opts.description) || opts.description
  const summarySource = cleaned.replace(/\s+/g, ' ').trim()
  const summary = summarySource.slice(0, 400)
  const responsibilities = cleaned
    .split(/\n\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 40)

  return {
    title: opts.title,
    company: opts.company,
    required_skills: [] as string[],
    preferred_skills: [] as string[],
    required_experience_years: 0,
    education_requirement: '',
    keywords: [] as string[],
    responsibilities,
    ats_system: opts.atsSystem || 'unknown',
    red_flags: [] as string[],
    company_values: [] as string[],
    compensation: { min: null, max: null, currency: 'USD', period: 'year' },
    work_type: '',
    seniority: '',
    summary,
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

/**
 * Token-authed job create for the Chrome extension.
 * Inserts a jobs row; DB trigger creates the tracker application.
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  const auth = request.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!bearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  }

  let userId: string | null
  try {
    userId = await resolveExtensionUserId(bearer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth failed'
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500
    return NextResponse.json({ error: message }, { status, headers })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401, headers })
  }

  let body: {
    url?: string
    title?: string
    company?: string
    description?: string
    location?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : ''
  if (!rawUrl) {
    return NextResponse.json({ error: 'url is required' }, { status: 400, headers })
  }
  const urlError = assertSavableJobUrl(rawUrl)
  if (urlError) {
    return NextResponse.json({ error: urlError }, { status: 400, headers })
  }

  const applyUrl = normalizeApplyUrl(rawUrl)

  let title = (body.title?.trim() || 'Untitled role').slice(0, 500)
  let company = (body.company?.trim() || 'Unknown').slice(0, 500)
  const location = body.location?.trim() ? body.location.trim().slice(0, 500) : null
  let description = (body.description?.trim() || `Saved from ${applyUrl}`).slice(0, MAX_DESCRIPTION)
  let atsSystem = 'unknown'

  const admin = createAdminClient()
  const base = APP_URL.replace(/\/$/, '')

  // Idempotent save: same user + normalized apply_url → return existing job (no duplicate).
  const { data: existing } = await admin
    .from('jobs')
    .select('id, title, company, location, description, apply_url')
    .eq('user_id', userId)
    .eq('apply_url', applyUrl)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    let savedDescription = existing.description || description
    let savedTitle = existing.title || title
    let savedCompany = existing.company || company
    const savedLocation = existing.location ?? location

    // Additive improve: glued chrome junk + ATS host → try scraper once.
    if (
      existing.description &&
      isGluedChromeJunk(existing.description) &&
      isScrapableAtsUrl(applyUrl)
    ) {
      try {
        const scraped = await scrapeJobUrl(applyUrl)
        if (isBetterScrapedDescription(scraped.text, existing.description)) {
          const cleaned = normalizeJobDescription(scraped.text).slice(0, MAX_DESCRIPTION)
          if (cleaned.length > existing.description.length) {
            const nextTitle = scraped.title?.trim()
              ? scraped.title.trim().slice(0, 500)
              : savedTitle
            const nextCompany = scraped.company?.trim()
              ? scraped.company.trim().slice(0, 500)
              : savedCompany
            await admin
              .from('jobs')
              .update({
                description: cleaned,
                title: nextTitle,
                company: nextCompany,
                extracted_data: buildExtractedData({
                  title: nextTitle,
                  company: nextCompany,
                  description: cleaned,
                  atsSystem: scraped.atsSystem || scraped.source,
                }),
              })
              .eq('id', existing.id)
              .eq('user_id', userId)
            savedDescription = cleaned
            savedTitle = nextTitle
            savedCompany = nextCompany
          }
        }
      } catch {
        // Keep existing description on scrape failure.
      }
    }

    const trackerUrl = `${base}/dashboard/tracker/${existing.id}`
    return NextResponse.json(
      {
        jobId: existing.id,
        trackerUrl,
        resumeUrl: `${trackerUrl}?tab=documents`,
        coverUrl: `${trackerUrl}?tab=documents`,
        saved: {
          title: savedTitle,
          company: savedCompany,
          location: savedLocation,
          applyUrl: existing.apply_url || applyUrl,
          descriptionChars: savedDescription.length,
        },
        existing: true,
      },
      { status: 200, headers },
    )
  }

  // New job: enrich from ATS APIs when the host is scrapable.
  if (isScrapableAtsUrl(applyUrl)) {
    try {
      const scraped = await scrapeJobUrl(applyUrl)
      if (isBetterScrapedDescription(scraped.text, description)) {
        const cleaned = normalizeJobDescription(scraped.text).slice(0, MAX_DESCRIPTION)
        if (cleaned) description = cleaned
        if (scraped.title?.trim()) title = scraped.title.trim().slice(0, 500)
        if (scraped.company?.trim()) company = scraped.company.trim().slice(0, 500)
        atsSystem = scraped.atsSystem || scraped.source || atsSystem
      }
    } catch {
      // Fall back to body description.
    }
  }

  description = (normalizeJobDescription(description) || description).slice(0, MAX_DESCRIPTION)

  const { data: jobRow, error } = await admin
    .from('jobs')
    .insert({
      user_id: userId,
      source: 'extension',
      company,
      title,
      description,
      location,
      apply_url: applyUrl,
      extracted_data: buildExtractedData({
        title,
        company,
        description,
        atsSystem,
      }),
    })
    .select('id')
    .single()

  if (error || !jobRow) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save job' },
      { status: 500, headers }
    )
  }

  const trackerUrl = `${base}/dashboard/tracker/${jobRow.id}`
  const resumeUrl = `${trackerUrl}?tab=documents`
  const coverUrl = `${trackerUrl}?tab=documents`

  return NextResponse.json(
    {
      jobId: jobRow.id,
      trackerUrl,
      resumeUrl,
      coverUrl,
      saved: {
        title,
        company,
        location,
        applyUrl,
        descriptionChars: description.length,
      },
    },
    { status: 201, headers }
  )
}
