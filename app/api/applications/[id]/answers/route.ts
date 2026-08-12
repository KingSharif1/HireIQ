import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  normalizeFormAnswers,
  removeFormAnswer,
  upsertFormAnswer,
} from '@/lib/applications/form-answers'
import type { ApplicationFormAnswer } from '@/types'

export const runtime = 'nodejs'

const patchSchema = z.object({
  key: z.string().trim().min(1).max(500),
  answer: z.string().max(20_000),
  /** Required when inserting a new key; ignored (kept) when updating. */
  question: z.string().trim().min(1).max(2000).optional(),
})

const deleteSchema = z.object({
  key: z.string().trim().min(1).max(500),
})

/**
 * Session-authed upsert/delete for application form_answers (dashboard).
 * PATCH { key, answer, question? } — upsert
 * DELETE { key } — remove
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { data: app, error: loadError } = await supabase
    .from('applications')
    .select('id, form_answers')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }
  if (!app) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existing = normalizeFormAnswers(app.form_answers)
  const prior = existing.find(a => a.key === parsed.data.key)
  const question = parsed.data.question?.trim() || prior?.question
  if (!question) {
    return NextResponse.json(
      { error: 'question is required when creating a new answer' },
      { status: 400 },
    )
  }

  const entry: ApplicationFormAnswer = {
    key: parsed.data.key,
    question,
    answer: parsed.data.answer,
    updatedAt: new Date().toISOString(),
  }
  const form_answers = upsertFormAnswer(existing, entry)

  const { data, error } = await supabase
    .from('applications')
    .update({ form_answers, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, form_answers')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({
    form_answers: normalizeFormAnswers(data.form_answers),
    answer: entry,
  })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = deleteSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { data: app, error: loadError } = await supabase
    .from('applications')
    .select('id, form_answers')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }
  if (!app) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existing = normalizeFormAnswers(app.form_answers)
  const form_answers = removeFormAnswer(existing, parsed.data.key)

  const { data, error } = await supabase
    .from('applications')
    .update({ form_answers, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, form_answers')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({
    form_answers: normalizeFormAnswers(data.form_answers),
  })
}
