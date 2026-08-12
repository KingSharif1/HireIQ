import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGitHubConnection, publicGitHubStatus, syncGitHubForUser } from '@/lib/github/sync'
import type { Profile } from '@/types'
import type { GitHubProfileData } from '@/lib/github/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [conn, profileRes] = await Promise.all([
    getGitHubConnection(supabase, user.id),
    supabase
      .from('profiles')
      .select('github_data')
      .eq('id', user.id)
      .maybeSingle<Pick<Profile, 'github_data'>>(),
  ])

  const githubData = profileRes.data?.github_data as GitHubProfileData | null
  return NextResponse.json(
    publicGitHubStatus(githubData, conn?.github_username, conn?.synced_at)
  )
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await syncGitHubForUser(supabase, user.id)
    return NextResponse.json({
      ok: true,
      ...publicGitHubStatus(result.githubData),
      suggestionsAdded: result.suggestionsAdded,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    const status = message.includes('not connected') ? 400 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
