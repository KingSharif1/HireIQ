import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveExtensionUserId } from '@/lib/extension/tokens'

export const runtime = 'nodejs'

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
 * List tailored resumes for a saved job (Chrome extension).
 * Bearer-authed via resolveExtensionUserId.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)
  const { id: jobId } = await context.params

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

  const admin = createAdminClient()

  const { data: job, error: jobError } = await admin
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle()

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500, headers })
  }
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404, headers })
  }

  // tailored_resumes has created_at + version (no updated_at / title columns)
  const { data: rows, error: listError } = await admin
    .from('tailored_resumes')
    .select('id, version, cover_letter, created_at')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500, headers })
  }

  const resumes = (rows ?? []).map(row => ({
    id: row.id as string,
    label: `Resume v${row.version ?? 1}`,
    updatedAt: (row.created_at as string) ?? null,
    hasCoverLetter: Boolean(row.cover_letter && String(row.cover_letter).trim()),
  }))

  return NextResponse.json({ resumes }, { status: 200, headers })
}
