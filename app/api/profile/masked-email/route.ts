import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { buildMaskedEmail, maskedEmailDomain } from '@/lib/email/masked-address'

const patchSchema = z.object({
  email_forward_to: z.string().email().nullable().optional(),
  email_forward_enabled: z.boolean().optional(),
})

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** GET current masked apply address (does not create). */
export async function GET() {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('masked_email, email_forward_to, email_forward_enabled, email')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let domain: string | null = null
  try {
    domain = maskedEmailDomain()
  } catch {
    domain = null
  }

  return NextResponse.json({
    masked_email: data.masked_email,
    email_forward_to: data.email_forward_to ?? data.email,
    email_forward_enabled: data.email_forward_enabled ?? true,
    domain,
    configured: Boolean(domain && process.env.RESEND_API_KEY),
  })
}

/** POST ensure a masked address exists (idempotent). */
export async function POST() {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let domain: string
  try {
    domain = maskedEmailDomain()
  } catch {
    return NextResponse.json(
      { error: 'Masked email is not configured (MASKED_EMAIL_DOMAIN)' },
      { status: 503 }
    )
  }

  const { data: profile, error: loadError } = await supabase
    .from('profiles')
    .select('masked_email, email_forward_to, email_forward_enabled, email, username, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (loadError || !profile) {
    return NextResponse.json({ error: loadError?.message ?? 'Profile not found' }, { status: 404 })
  }

  if (profile.masked_email) {
    return NextResponse.json({
      masked_email: profile.masked_email,
      email_forward_to: profile.email_forward_to ?? profile.email,
      email_forward_enabled: profile.email_forward_enabled ?? true,
      created: false,
      domain,
    })
  }

  // Retry a few times on unique collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const address = buildMaskedEmail({
      username: profile.username,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email ?? user.email,
      domain,
    })

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        masked_email: address,
        email_forward_to: profile.email_forward_to ?? profile.email ?? user.email ?? null,
        email_tracking_mode: 'masked',
        gmail_sync_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .is('masked_email', null)
      .select('masked_email, email_forward_to, email_forward_enabled, email')
      .maybeSingle()

    if (!error && updated?.masked_email) {
      return NextResponse.json({
        masked_email: updated.masked_email,
        email_forward_to: updated.email_forward_to ?? updated.email,
        email_forward_enabled: updated.email_forward_enabled ?? true,
        created: true,
        mode: 'masked',
        domain,
      })
    }

    // Another request may have won — re-read
    const { data: again } = await supabase
      .from('profiles')
      .select('masked_email, email_forward_to, email_forward_enabled, email')
      .eq('id', user.id)
      .single()
    if (again?.masked_email) {
      return NextResponse.json({
        masked_email: again.masked_email,
        email_forward_to: again.email_forward_to ?? again.email,
        email_forward_enabled: again.email_forward_enabled ?? true,
        created: false,
        domain,
      })
    }

    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Could not allocate masked email' }, { status: 500 })
}

/** PATCH forward settings. */
export async function PATCH(request: Request) {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('masked_email, email_forward_to, email_forward_enabled, email')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    masked_email: data.masked_email,
    email_forward_to: data.email_forward_to ?? data.email,
    email_forward_enabled: data.email_forward_enabled ?? true,
  })
}
