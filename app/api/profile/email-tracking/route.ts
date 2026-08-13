import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { setGmailSyncEnabled } from '@/lib/google/connection'

export type EmailTrackingMode = 'gmail' | 'masked' | 'off'

const patchSchema = z.object({
  mode: z.enum(['gmail', 'masked', 'off']),
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('email_tracking_mode, gmail_sync_enabled, masked_email, email')
    .eq('id', user.id)
    .maybeSingle()

  const { data: google } = await supabase
    .from('google_connections')
    .select('google_email, synced_at, connected_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const mode = (profile?.email_tracking_mode as EmailTrackingMode | null) ?? 'gmail'

  return NextResponse.json({
    mode,
    gmailSyncEnabled: profile?.gmail_sync_enabled !== false,
    gmailConnected: Boolean(google),
    gmailEmail: google?.google_email ?? null,
    gmailSyncedAt: google?.synced_at ?? null,
    maskedEmail: profile?.masked_email ?? null,
    accountEmail: profile?.email ?? user.email ?? null,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'mode must be gmail | masked | off' }, { status: 400 })
  }

  const mode = parsed.data.mode

  if (mode === 'masked') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('masked_email')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.masked_email) {
      return NextResponse.json(
        { error: 'Create an application email first, then switch to masked tracking.' },
        { status: 400 },
      )
    }
  }

  if (mode === 'gmail') {
    const { data: google } = await supabase
      .from('google_connections')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!google) {
      return NextResponse.json(
        { error: 'Connect Gmail first, then enable Gmail tracking.' },
        { status: 400 },
      )
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      email_tracking_mode: mode,
      gmail_sync_enabled: mode === 'gmail',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await setGmailSyncEnabled(supabase, user.id, mode === 'gmail')

  const { data: profile } = await supabase
    .from('profiles')
    .select('email_tracking_mode, gmail_sync_enabled, masked_email, email')
    .eq('id', user.id)
    .maybeSingle()

  const { data: google } = await supabase
    .from('google_connections')
    .select('google_email, synced_at')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    mode: (profile?.email_tracking_mode as EmailTrackingMode | null) ?? mode,
    gmailSyncEnabled: profile?.gmail_sync_enabled !== false,
    gmailConnected: Boolean(google),
    gmailEmail: google?.google_email ?? null,
    gmailSyncedAt: google?.synced_at ?? null,
    maskedEmail: profile?.masked_email ?? null,
    accountEmail: profile?.email ?? user.email ?? null,
  })
}
