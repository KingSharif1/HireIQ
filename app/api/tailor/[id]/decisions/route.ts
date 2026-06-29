import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildApprovedResume } from '@/lib/tailor/change-decisions'
import type { ChangeDecision, StructuredResume } from '@/types'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    change_decisions?: Record<string, ChangeDecision>
  }

  if (!body.change_decisions || typeof body.change_decisions !== 'object') {
    return NextResponse.json({ error: 'change_decisions required' }, { status: 400 })
  }

  const { data: row } = await supabase
    .from('tailored_resumes')
    .select('structured_data, original_structured_data, changes, change_decisions')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const original = (row.original_structured_data ?? row.structured_data) as StructuredResume
  const tailored = row.structured_data as StructuredResume
  const approved = buildApprovedResume(original, tailored, row.changes ?? [], body.change_decisions)

  const { data: updated, error } = await supabase
    .from('tailored_resumes')
    .update({
      change_decisions: body.change_decisions,
      user_edited: true,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, change_decisions, user_edited')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save decisions' }, { status: 500 })
  }

  return NextResponse.json({
    ...updated,
    approvedData: approved,
  })
}
