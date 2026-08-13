import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveExtensionUserId } from '@/lib/extension/tokens'
import { fetchVerificationCodeForUser } from '@/lib/extension/fetch-verification-code'

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

/** Poll Gmail or masked inbound for a recent employer verification code. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)
  await context.params

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
  const { data: profile } = await admin
    .from('profiles')
    .select('email, email_tracking_mode')
    .eq('id', userId)
    .maybeSingle<{ email: string | null; email_tracking_mode: string | null }>()

  const mode = (profile?.email_tracking_mode as 'gmail' | 'masked' | 'off' | null) ?? 'off'
  if (mode === 'off') {
    return NextResponse.json(
      { code: null, error: 'Email tracking is off — cannot poll verification codes.' },
      { status: 422, headers },
    )
  }

  try {
    const result = await fetchVerificationCodeForUser(
      userId,
      mode,
      profile?.email?.trim() || '',
    )
    return NextResponse.json(result, { status: 200, headers })
  } catch (err) {
    return NextResponse.json(
      { code: null, error: err instanceof Error ? err.message : 'Verification poll failed' },
      { status: 500, headers },
    )
  }
}
