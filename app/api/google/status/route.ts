import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publicGoogleStatus, setGmailSyncEnabled } from '@/lib/google/connection'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = await publicGoogleStatus(supabase, user.id)
  return NextResponse.json(status)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { gmailSyncEnabled?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.gmailSyncEnabled !== 'boolean') {
    return NextResponse.json({ error: 'gmailSyncEnabled boolean required' }, { status: 400 })
  }

  await setGmailSyncEnabled(supabase, user.id, body.gmailSyncEnabled)
  const status = await publicGoogleStatus(supabase, user.id)
  return NextResponse.json(status)
}
