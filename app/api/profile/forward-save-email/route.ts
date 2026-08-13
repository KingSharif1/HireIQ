import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildForwardSaveEmail, maskedEmailDomain } from '@/lib/email/masked-address'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

function payload(opts: {
  forward_save_email: string | null
  domain: string | null
  created?: boolean
}) {
  return {
    forward_save_email: opts.forward_save_email,
    domain: opts.domain,
    configured: Boolean(opts.domain && process.env.RESEND_API_KEY),
    created: opts.created,
  }
}

/** GET current forward-to-save address (does not create). */
export async function GET() {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('forward_save_email')
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

  return NextResponse.json(payload({ forward_save_email: data.forward_save_email, domain }))
}

/** POST ensure a forward-to-save address exists (idempotent). */
export async function POST() {
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let domain: string
  try {
    domain = maskedEmailDomain()
  } catch {
    return NextResponse.json(
      { error: 'Masked email is not configured (MASKED_EMAIL_DOMAIN)' },
      { status: 503 },
    )
  }

  const { data: profile, error: loadError } = await supabase
    .from('profiles')
    .select('forward_save_email, username, first_name, last_name, email')
    .eq('id', user.id)
    .single()

  if (loadError || !profile) {
    return NextResponse.json({ error: loadError?.message ?? 'Profile not found' }, { status: 404 })
  }

  if (profile.forward_save_email) {
    return NextResponse.json(
      payload({ forward_save_email: profile.forward_save_email, domain, created: false }),
    )
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const address = buildForwardSaveEmail({
      username: profile.username,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email ?? user.email,
      domain,
    })

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        forward_save_email: address,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .is('forward_save_email', null)
      .select('forward_save_email')
      .maybeSingle()

    if (!error && updated?.forward_save_email) {
      return NextResponse.json(
        payload({ forward_save_email: updated.forward_save_email, domain, created: true }),
      )
    }

    const { data: again } = await supabase
      .from('profiles')
      .select('forward_save_email')
      .eq('id', user.id)
      .single()
    if (again?.forward_save_email) {
      return NextResponse.json(
        payload({ forward_save_email: again.forward_save_email, domain, created: false }),
      )
    }

    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Could not allocate save address' }, { status: 500 })
}
