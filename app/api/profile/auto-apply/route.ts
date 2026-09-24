import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const patchSchema = z.object({ submit: z.boolean() })

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('auto_apply_submit')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json({ submit: profile.auto_apply_submit !== false })
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
    return NextResponse.json({ error: 'submit must be a boolean' }, { status: 400 })
  }

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({
      auto_apply_submit: parsed.data.submit,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('auto_apply_submit')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  return NextResponse.json({ submit: updated.auto_apply_submit !== false })
}
