import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveExtensionUserId } from '@/lib/extension/tokens'
import { assertSavableJobUrl } from '@/lib/extension/job-page'

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

  const url = typeof body.url === 'string' ? body.url.trim() : ''
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400, headers })
  }
  const urlError = assertSavableJobUrl(url)
  if (urlError) {
    return NextResponse.json({ error: urlError }, { status: 400, headers })
  }

  const title = (body.title?.trim() || 'Untitled role').slice(0, 500)
  const company = (body.company?.trim() || 'Unknown').slice(0, 500)
  const location = body.location?.trim() ? body.location.trim().slice(0, 500) : null
  const description = (body.description?.trim() || `Saved from ${url}`).slice(0, MAX_DESCRIPTION)

  const admin = createAdminClient()
  const base = APP_URL.replace(/\/$/, '')

  // Idempotent save: same user + apply_url → return existing job (no duplicate).
  const { data: existing } = await admin
    .from('jobs')
    .select('id, title, company, location, description, apply_url')
    .eq('user_id', userId)
    .eq('apply_url', url)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    const trackerUrl = `${base}/dashboard/tracker/${existing.id}`
    return NextResponse.json(
      {
        jobId: existing.id,
        trackerUrl,
        resumeUrl: `${trackerUrl}?tab=documents`,
        coverUrl: `${trackerUrl}?tab=documents`,
        saved: {
          title: existing.title || title,
          company: existing.company || company,
          location: existing.location ?? location,
          applyUrl: existing.apply_url || url,
          descriptionChars: (existing.description || description).length,
        },
        existing: true,
      },
      { status: 200, headers },
    )
  }

  const { data: jobRow, error } = await admin
    .from('jobs')
    .insert({
      user_id: userId,
      source: 'extension',
      company,
      title,
      description,
      location,
      apply_url: url,
      extracted_data: {
        title,
        company,
        required_skills: [],
        preferred_skills: [],
        required_experience_years: 0,
        education_requirement: '',
        keywords: [],
        responsibilities: description
          .split(/\n+/)
          .map(s => s.trim())
          .filter(Boolean)
          .slice(0, 40),
        ats_system: 'unknown',
        red_flags: [],
        company_values: [],
        compensation: { min: null, max: null, currency: 'USD', period: 'year' },
        work_type: '',
        seniority: '',
        summary: description.slice(0, 500),
      },
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
        applyUrl: url,
        descriptionChars: description.length,
      },
    },
    { status: 201, headers }
  )
}
