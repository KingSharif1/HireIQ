import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveExtensionUserId } from '@/lib/extension/tokens'
import { assertSavableJobUrl } from '@/lib/extension/job-page'
import { normalizeApplyUrl } from '@/lib/extension/normalize-url'

export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    origin && (origin.startsWith('chrome-extension://') || origin === 'http://localhost:3000')
      ? origin
      : '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

/**
 * Lookup a saved job by apply URL for the signed-in extension user.
 * GET ?url=
 */
export async function GET(request: Request) {
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

  const raw = new URL(request.url).searchParams.get('url') || ''
  if (!raw.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400, headers })
  }
  const urlError = assertSavableJobUrl(raw)
  if (urlError) {
    return NextResponse.json({ error: urlError }, { status: 400, headers })
  }

  const normalized = normalizeApplyUrl(raw)
  const admin = createAdminClient()

  const candidates = Array.from(new Set([normalized, raw.trim()].filter(Boolean)))
  const { data: rows, error } = await admin
    .from('jobs')
    .select('id, title, company, apply_url, created_at')
    .eq('user_id', userId)
    .in('apply_url', candidates)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers })
  }

  const hit =
    rows?.find(r => normalizeApplyUrl(r.apply_url || '') === normalized) ||
    rows?.[0] ||
    null

  if (!hit) {
    return NextResponse.json({ saved: false }, { status: 200, headers })
  }

  const base = APP_URL.replace(/\/$/, '')
  const trackerUrl = `${base}/dashboard/tracker/${hit.id}`
  return NextResponse.json(
    {
      saved: true,
      jobId: hit.id,
      trackerUrl,
      resumeUrl: `${trackerUrl}?tab=documents`,
      coverUrl: `${trackerUrl}?tab=documents`,
      title: hit.title,
      company: hit.company,
    },
    { status: 200, headers },
  )
}
