import { after, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTailorRun, patchTailorRun } from '@/lib/tailor/runs'
import { executeGeneratePhase } from '@/lib/tailor/execute-run'
import { hasMaterialGapAnswers, isSkipGapAnswer } from '@/lib/tailor/ats-gap-hints'
import { TAILOR_RUN_CLAUDE } from '@/lib/tailor/run-types'
import { AI_IN_FLIGHT_MESSAGE } from '@/lib/ai/once'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const run = await getTailorRun(supabase, user.id, id)
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (run.status === 'generating') {
    return NextResponse.json({ run, resumed: true })
  }

  const body = (await request.json().catch(() => ({}))) as { answers?: Record<string, string> }
  const answers = body.answers ?? {}

  // Legacy pre-draft Q&A (runs created before draft-first).
  if (run.status === 'awaiting_answers') {
    if (run.generate_reserved) {
      return NextResponse.json({ run, resumed: true })
    }
    after(() => executeGeneratePhase(run.id, user.id, answers))
    return NextResponse.json(
      { run: { ...run, status: 'generating', answers }, resumed: false },
      { status: 202 },
    )
  }

  // Post-draft optional chips (Task 162).
  if (run.status === 'needs_review') {
    const questions = run.questions ?? []
    if (questions.length === 0) {
      return NextResponse.json({ run, resumed: true })
    }

    const material = hasMaterialGapAnswers(answers, questions)
    if (!material) {
      // All skipped / empty — clear chips, stay in review, no AI.
      const clearedAnswers: Record<string, string> = {}
      for (const q of questions) {
        const v = answers[q.id]
        if (v?.trim() && isSkipGapAnswer(v)) clearedAnswers[q.id] = v
      }
      const updated = await patchTailorRun(supabase, run.id, {
        questions: [],
        answers: clearedAnswers,
      })
      return NextResponse.json({ run: updated ?? { ...run, questions: [], answers: clearedAnswers } })
    }

    if (run.claude_calls >= TAILOR_RUN_CLAUDE.total) {
      return NextResponse.json(
        { error: 'This tailor session already used its AI budget.', run },
        { status: 409 },
      )
    }

    after(() => executeGeneratePhase(run.id, user.id, answers))
    return NextResponse.json(
      { run: { ...run, status: 'generating', answers }, resumed: false },
      { status: 202 },
    )
  }

  return NextResponse.json(
    { error: AI_IN_FLIGHT_MESSAGE, run },
    { status: 409 },
  )
}
