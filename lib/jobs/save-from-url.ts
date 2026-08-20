import { createAdminClient } from '@/lib/supabase/admin'
import { assertSavableJobUrl } from '@/lib/extension/job-page'
import { normalizeApplyUrl } from '@/lib/extension/normalize-url'
import { normalizeJobDescription } from '@/lib/jobs/description'
import { scrapeJobUrl, LinkedInBlockedError } from '@/lib/jobs/job-scraper'
import { classifyApplyEase } from '@/lib/apply/ease'
import { detectJobUrlKind } from '@/lib/jobs/url-detect'

const MAX_DESCRIPTION = 50_000

export type SaveJobFromUrlInput = {
  userId: string
  url: string
  source: string
  title?: string
  company?: string
  description?: string
  location?: string
}

export type SaveJobFromUrlResult = {
  jobId: string
  existing: boolean
  title: string
  company: string
  location: string | null
  applyUrl: string
  descriptionChars: number
}

export class UnsavableJobUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsavableJobUrlError'
  }
}

function isScrapableAtsUrl(url: string): boolean {
  const kind = detectJobUrlKind(url)
  return kind === 'greenhouse' || kind === 'lever' || kind === 'ashby' || kind === 'workday'
}

function startsWithChromeNoise(text: string): boolean {
  return /^(back to jobs|create a job alert|quick apply|mygreenhouse)/i.test(text.trimStart())
}

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
  applyUrl?: string
  applyEase?: ReturnType<typeof classifyApplyEase>
}) {
  const cleaned = normalizeJobDescription(opts.description) || opts.description
  const summarySource = cleaned.replace(/\s+/g, ' ').trim()
  const summary = summarySource.slice(0, 400)
  const responsibilities = cleaned
    .split(/\n\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 40)

  const ease = opts.applyEase ?? classifyApplyEase({ url: opts.applyUrl })

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
    apply_ease: ease.ease,
    apply_ease_reason: ease.reason,
  }
}

async function tryScrape(url: string): Promise<{
  title: string
  company: string
  description: string
  atsSystem: string
  applyEase?: ReturnType<typeof classifyApplyEase>
  detectedApplyUrl?: string
} | null> {
  try {
    const scraped = await scrapeJobUrl(url)
    const cleaned = normalizeJobDescription(scraped.text).slice(0, MAX_DESCRIPTION)
    if (!cleaned) return null
    return {
      title: scraped.title?.trim().slice(0, 500) || '',
      company: scraped.company?.trim().slice(0, 500) || '',
      description: cleaned,
      atsSystem: scraped.atsSystem || scraped.source || 'unknown',
      applyEase: scraped.applyEase,
      detectedApplyUrl: scraped.detectedApplyUrl,
    }
  } catch (err) {
    if (err instanceof LinkedInBlockedError) return null
    return null
  }
}

/**
 * Idempotent job insert: same user + normalized apply_url returns the existing row.
 * Shared by the Chrome extension save API and forward-to-save inbound email.
 */
export async function saveJobFromUrl(input: SaveJobFromUrlInput): Promise<SaveJobFromUrlResult> {
  const urlError = assertSavableJobUrl(input.url)
  if (urlError) throw new UnsavableJobUrlError(urlError)

  const applyUrl = normalizeApplyUrl(input.url)
  let title = (input.title?.trim() || 'Untitled role').slice(0, 500)
  let company = (input.company?.trim() || 'Unknown').slice(0, 500)
  const location = input.location?.trim() ? input.location.trim().slice(0, 500) : null
  let description = (input.description?.trim() || `Saved from ${applyUrl}`).slice(0, MAX_DESCRIPTION)
  let atsSystem = 'unknown'
  let applyEase = classifyApplyEase({ url: applyUrl })
  let resolvedApplyUrl = applyUrl

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('jobs')
    .select('id, title, company, location, description, apply_url')
    .eq('user_id', input.userId)
    .eq('apply_url', applyUrl)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    let savedDescription = existing.description || description
    let savedTitle = existing.title || title
    let savedCompany = existing.company || company
    const savedLocation = existing.location ?? location

    if (
      existing.description &&
      isGluedChromeJunk(existing.description) &&
      isScrapableAtsUrl(applyUrl)
    ) {
      const scraped = await tryScrape(applyUrl)
      if (scraped && isBetterScrapedDescription(scraped.description, existing.description)) {
        await admin
          .from('jobs')
          .update({
            description: scraped.description,
            title: scraped.title || savedTitle,
            company: scraped.company || savedCompany,
            extracted_data: buildExtractedData({
              title: scraped.title || savedTitle,
              company: scraped.company || savedCompany,
              description: scraped.description,
              atsSystem: scraped.atsSystem,
              applyUrl,
              applyEase: scraped.applyEase,
            }),
          })
          .eq('id', existing.id)
          .eq('user_id', input.userId)
        savedDescription = scraped.description
        savedTitle = scraped.title || savedTitle
        savedCompany = scraped.company || savedCompany
      }
    }

    return {
      jobId: existing.id,
      existing: true,
      title: savedTitle,
      company: savedCompany,
      location: savedLocation,
      applyUrl: existing.apply_url || applyUrl,
      descriptionChars: savedDescription.length,
    }
  }

  if (isScrapableAtsUrl(applyUrl) || !input.description?.trim()) {
    const scraped = await tryScrape(applyUrl)
    if (scraped && isBetterScrapedDescription(scraped.description, description)) {
      description = scraped.description
      if (scraped.title) title = scraped.title
      if (scraped.company) company = scraped.company
      atsSystem = scraped.atsSystem
      if (scraped.applyEase) applyEase = scraped.applyEase
      if (scraped.detectedApplyUrl) resolvedApplyUrl = normalizeApplyUrl(scraped.detectedApplyUrl)
    }
  }

  description = (normalizeJobDescription(description) || description).slice(0, MAX_DESCRIPTION)

  const { data: jobRow, error } = await admin
    .from('jobs')
    .insert({
      user_id: input.userId,
      source: input.source,
      company,
      title,
      description,
      location,
      apply_url: resolvedApplyUrl,
      extracted_data: buildExtractedData({
        title,
        company,
        description,
        atsSystem,
        applyUrl: resolvedApplyUrl,
        applyEase,
      }),
    })
    .select('id')
    .single()

  if (error || !jobRow) {
    throw new Error(error?.message || 'Failed to save job')
  }

  return {
    jobId: jobRow.id,
    existing: false,
    title,
    company,
    location,
    applyUrl: resolvedApplyUrl,
    descriptionChars: description.length,
  }
}
