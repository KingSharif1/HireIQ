import { after, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTailorRun } from '@/lib/tailor/runs'
import { executeGeneratePhase } from '@/lib/tailor/execute-run'
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

  if (run.generate_reserved || run.status === 'generating' || run.status === 'needs_review') {
    return NextResponse.json({ run, resumed: true })
  }
  if (run.status !== 'awaiting_answers') {
    return NextResponse.json(
      { error: AI_IN_FLIGHT_MESSAGE, run },
      { status: 409 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as { answers?: Record<string, string> }
  const answers = body.answers ?? {}

  after(() => executeGeneratePhase(run.id, user.id, answers))
  return NextResponse.json({ run: { ...run, status: 'generating', answers }, resumed: false }, { status: 202 })
}
