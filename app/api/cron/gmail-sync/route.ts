import { NextResponse } from 'next/server'
import { syncGmailForAllEnabledUsers } from '@/lib/google/sync'
import { isGoogleOAuthConfigured } from '@/lib/google/oauth'

/**
 * Cron / manual batch Gmail sync.
 * Auth: Authorization: Bearer ${CRON_SECRET} or ?secret=
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }

  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const url = new URL(request.url)
  const querySecret = url.searchParams.get('secret') ?? ''
  if (bearer !== secret && querySecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json({ error: 'Google OAuth is not configured' }, { status: 503 })
  }

  const batch = await syncGmailForAllEnabledUsers(50)
  return NextResponse.json({ ok: true, ...batch })
}

export async function POST(request: Request) {
  return GET(request)
}
