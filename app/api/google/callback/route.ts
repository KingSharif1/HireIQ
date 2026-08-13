import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchGoogleUserInfo } from '@/lib/google/client'
import { saveGoogleConnection } from '@/lib/google/connection'
import {
  exchangeGoogleCode,
  GOOGLE_OAUTH_STATE_COOKIE,
} from '@/lib/google/oauth'

function profilePersonalUrl(error?: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const url = new URL('/dashboard/settings', base)
  if (error) url.searchParams.set('google_error', error)
  return url.toString()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const denied = searchParams.get('error')

  const cookieStore = await cookies()
  const savedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE)

  if (denied) {
    return NextResponse.redirect(profilePersonalUrl('denied'))
  }

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(profilePersonalUrl('state_mismatch'))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  }

  try {
    const tokenRes = await exchangeGoogleCode(code)
    if (!tokenRes.refresh_token) {
      return NextResponse.redirect(profilePersonalUrl('missing_refresh'))
    }
    const info = await fetchGoogleUserInfo(tokenRes.access_token)
    await saveGoogleConnection(supabase, user.id, {
      email: info.email,
      accessToken: tokenRes.access_token,
      refreshToken: tokenRes.refresh_token,
      scopes: tokenRes.scope,
      expiresIn: tokenRes.expires_in,
    })
    return NextResponse.redirect(profilePersonalUrl())
  } catch (e) {
    console.error('Google OAuth callback failed:', e)
    const msg =
      e instanceof Error && e.message.includes('not configured') ? 'not_configured' : 'exchange_failed'
    return NextResponse.redirect(profilePersonalUrl(msg))
  }
}
