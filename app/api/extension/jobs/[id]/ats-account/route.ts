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
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

/**
 * Save the email the user used (or will use) on an employer ATS account.
 */
export async function PATCH(
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

  let body: { email?: string; note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400, headers })
  }

  const admin = createAdminClient()
  const { data: app, error } = await admin
    .from('applications')
    .update({
      ats_account_email: email,
      ats_account_note: note || null,
      updated_at: new Date().toISOString(),
    })
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .select('id, job_id, ats_account_email')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers })
  }
  if (!app) {
    return NextResponse.json({ error: 'Application not found for this job' }, { status: 404, headers })
  }

  return NextResponse.json({ ok: true, application: app }, { status: 200, headers })
}
