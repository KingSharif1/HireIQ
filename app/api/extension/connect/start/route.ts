import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mintConnectCode } from '@/lib/extension/connect'

export const runtime = 'nodejs'

/**
 * Cookie-authed: mint a one-time connect code for the Chrome extension.
 * Call from /extension/connect while the user is signed into HireIQ.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to HireIQ first' }, { status: 401 })
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token || !session?.refresh_token) {
    return NextResponse.json(
      { error: 'Session incomplete — sign out and sign in again, then retry Connect' },
      { status: 401 },
    )
  }

  try {
    const minted = await mintConnectCode({
      userId: user.id,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    })
    return NextResponse.json({
      code: minted.code,
      expiresAt: minted.expiresAt,
      email: user.email ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mint code'
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
