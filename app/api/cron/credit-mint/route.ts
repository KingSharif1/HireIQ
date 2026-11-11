import { NextResponse } from 'next/server'
import { mintMonthlyCreditsForAllUsers } from '@/lib/credits/mint'

/**
 * Cron / manual monthly credit mint.
 * Auth: Authorization: Bearer ${CRON_SECRET} or ?secret=
 * Idempotent — safe to run daily.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'CRON_SECRET not configured' })
  }

  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const url = new URL(request.url)
  const querySecret = url.searchParams.get('secret') ?? ''
  if (bearer !== secret && querySecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const batch = await mintMonthlyCreditsForAllUsers()
    return NextResponse.json({ ok: true, ...batch })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Mint failed' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
