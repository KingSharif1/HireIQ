import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const eventSchema = z.object({
  type: z.enum(['manual', 'note']).default('manual'),
  title: z.string().trim().min(1).max(160),
  detail: z.string().trim().max(4000).optional(),
  at: z.string().optional(),
})

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = eventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data: application } = await supabase
    .from('applications')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  const createdAt =
    parsed.data.at && !Number.isNaN(Date.parse(parsed.data.at))
      ? new Date(parsed.data.at).toISOString()
      : new Date().toISOString()

  const { data: event, error } = await supabase
    .from('application_events')
    .insert({
      application_id: id,
      user_id: user.id,
      event_type: parsed.data.type,
      meta: {
        title: parsed.data.title,
        detail: parsed.data.detail,
        via: 'job_detail',
      },
      created_at: createdAt,
    })
    .select('*')
    .single()

  if (error || !event) {
    return NextResponse.json({ error: error?.message ?? 'Failed to add event' }, { status: 500 })
  }

  return NextResponse.json({ event }, { status: 201 })
}
