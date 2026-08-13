import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeGitHubCode,
  GITHUB_OAUTH_STATE_COOKIE,
} from '@/lib/github/oauth'
import { fetchGitHubUser } from '@/lib/github/client'
import { saveGitHubConnection, syncGitHubForUser } from '@/lib/github/sync'

function profileProjectsUrl(error?: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const url = new URL('/dashboard/builder', base)
  url.searchParams.set('view', 'master')
  url.searchParams.set('section', 'projects')
  if (error) url.searchParams.set('github_error', error)
  return url.toString()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const denied = searchParams.get('error')

  const cookieStore = await cookies()
  const savedState = cookieStore.get(GITHUB_OAUTH_STATE_COOKIE)?.value
  cookieStore.delete(GITHUB_OAUTH_STATE_COOKIE)

  if (denied) {
    return NextResponse.redirect(profileProjectsUrl('denied'))
  }

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(profileProjectsUrl('state_mismatch'))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  }

  try {
    const tokenRes = await exchangeGitHubCode(code)
    const ghUser = await fetchGitHubUser(tokenRes.access_token)
    await saveGitHubConnection(
      supabase,
      user.id,
      tokenRes.access_token,
      ghUser.login,
      tokenRes.scope
    )
    await syncGitHubForUser(supabase, user.id, tokenRes.access_token)
    return NextResponse.redirect(profileProjectsUrl())
  } catch (e) {
    console.error('GitHub OAuth callback failed:', e)
    const msg = e instanceof Error && e.message.includes('not configured') ? 'not_configured' : 'exchange_failed'
    return NextResponse.redirect(profileProjectsUrl(msg))
  }
}
