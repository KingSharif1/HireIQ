import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const emailEntrySchema = z.object({
  id: z.string().min(1).max(200),
  subject: z.string().trim().min(1).max(500),
  body: z.string().max(50_000).optional(),
  direction: z.enum(['sent', 'received', 'note']),
  at: z.string(),
  sender: z.string().max(500).optional(),
  recipients: z.array(z.string().max(500)).max(50).optional(),
  cc: z.array(z.string().max(500)).max(50).optional(),
  snippet: z.string().max(1000).optional(),
  threadId: z.string().max(500).optional(),
  messageId: z.string().max(500).optional(),
  source: z.enum(['manual', 'gmail', 'forwarded', 'masked']).optional(),
  isRead: z.boolean().optional(),
})

const patchSchema = z.object({
  notes: z.string().nullable().optional(),
  email_log: z.array(emailEntrySchema).max(200).optional(),
  templates: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        subject: z.string(),
        body: z.string(),
      })
    )
    .optional(),
})

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const { data: current } = parsed.data.email_log
    ? await supabase
        .from('applications')
        .select('email_log')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  const { data, error } = await supabase
    .from('applications')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })
  }

  if (parsed.data.email_log) {
    const previous = Array.isArray(current?.email_log) ? current.email_log : []
    const previousIds = new Set(
      previous.flatMap(entry =>
        typeof entry === 'object' && entry && 'id' in entry && typeof entry.id === 'string'
          ? [entry.id]
          : []
      )
    )
    const added = parsed.data.email_log.filter(entry => !previousIds.has(entry.id))

    if (added.length > 0) {
      const { error: eventError } = await supabase.from('application_events').insert(
        added.map(entry => ({
          application_id: id,
          user_id: user.id,
          event_type: 'email_linked',
          meta: {
            emailId: entry.id,
            subject: entry.subject,
            body: entry.body,
            direction: entry.direction,
            source: entry.source ?? 'manual',
          },
          created_at: entry.at,
        }))
      )

      if (eventError) {
        await supabase
          .from('applications')
          .update({ email_log: previous, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)
        return NextResponse.json({ error: eventError.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ application: data })
}
