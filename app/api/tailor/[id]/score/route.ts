import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreTailoredWithDecisions } from '@/lib/scoring/tailored-rescore'
import type { ChangeDecision, StructuredResume } from '@/types'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    change_decisions?: Record<string, ChangeDecision>
    persist?: boolean
  }

  const { data: row } = await supabase
    .from('tailored_resumes')
    .select('structured_data, original_structured_data, changes, change_decisions, job_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: job } = await supabase
    .from('jobs')
    .select('extracted_data')
    .eq('id', row.job_id)
    .eq('user_id', user.id)
    .single()

  if (!job?.extracted_data) {
    return NextResponse.json({ error: 'Job not found or not analyzed' }, { status: 404 })
  }

  const original = (row.original_structured_data ?? row.structured_data) as StructuredResume
  const tailored = row.structured_data as StructuredResume
  const decisions = body.change_decisions ?? (row.change_decisions as Record<string, ChangeDecision>) ?? {}

  const { score, matchScore } = scoreTailoredWithDecisions({
    original,
    tailored,
    changes: row.changes ?? [],
    changeDecisions: decisions,
    jobExtractedData: job.extracted_data,
  })

  if (body.persist === true) {
    const { error } = await supabase
      .from('tailored_resumes')
      .update({
        match_score: matchScore,
        tailored_score: score.total,
        ...(body.change_decisions ? { change_decisions: body.change_decisions } : {}),
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to persist score' }, { status: 500 })
    }
  }

  return NextResponse.json({ score })
}
