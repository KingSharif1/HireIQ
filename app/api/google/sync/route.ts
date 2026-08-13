import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncGmailForUser } from '@/lib/google/sync'
import { isGoogleOAuthConfigured } from '@/lib/google/oauth'

export async function POST() {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json({ error: 'Google OAuth is not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await syncGmailForUser(user.id)
  if (result.errors.includes('not_connected')) {
    return NextResponse.json({ error: 'Connect Gmail first' }, { status: 400 })
  }
  if (result.errors.includes('opted_out')) {
    return NextResponse.json({ error: 'Gmail sync is turned off' }, { status: 400 })
  }
  if (result.errors.length && result.scanned === 0) {
    return NextResponse.json({ error: result.errors[0], result }, { status: 502 })
  }

  return NextResponse.json({ ok: true, result })
}
