import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectGitHubAccount } from '@/lib/github/sync'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await disconnectGitHubAccount(supabase, user.id)
  return NextResponse.json({ ok: true })
}
