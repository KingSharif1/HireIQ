import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildGitHubAuthorizeUrl,
  GITHUB_OAUTH_STATE_COOKIE,
  isGitHubOAuthConfigured,
} from '@/lib/github/oauth'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  }

  if (!isGitHubOAuthConfigured()) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    return NextResponse.redirect(
      `${base}/dashboard/profile?section=projects&github_error=not_configured`,
    )
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set(GITHUB_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return NextResponse.redirect(buildGitHubAuthorizeUrl(state))
}
