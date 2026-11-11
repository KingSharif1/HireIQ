import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTokenUserId } from '@/lib/extension/tokens'
import { ApplyQueueError, dispatchApplyWorker, queueServerApply } from '@/lib/apply/queue'
import { assessResume } from '@/lib/apply/resume'
import type { ApplyRunRow } from '@/lib/apply/types'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ runId: string }> }

async function resolveUserId(request: Request): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) return user.id

  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  return bearer ? resolveTokenUserId(bearer) : null
}

async function loadRun(runId: string, userId: string): Promise<ApplyRunRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('apply_runs')
    .select(
      'id, user_id, job_id, application_id, mode, status, complexity, board, apply_url, submit, error, result, started_at, finished_at, created_at, updated_at',
    )
    .eq('id', runId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as ApplyRunRow | null) ?? null
}

/**
 * GET /api/apply/runs/[runId]/resume
 * What the human needs to do before this paused apply can be retried.
 */
export async function GET(request: Request, context: RouteContext) {
  const { runId } = await context.params
  const userId = await resolveUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const run = await loadRun(runId, userId)
  if (!run) return NextResponse.json({ error: 'Apply run not found' }, { status: 404 })

  return NextResponse.json({ assessment: assessResume(run) })
}

/**
 * POST /api/apply/runs/[runId]/resume
 * Body: { action?: 'retry' | 'cancel' }
 *
 * The worker is one-shot, so "retry" queues a fresh run with force (it must be
 * allowed to supersede the finished attempt). "cancel" closes a paused run.
 */
export async function POST(request: Request, context: RouteContext) {
  const { runId } = await context.params
  const userId = await resolveUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let action: 'retry' | 'cancel' = 'retry'
  try {
    const body = (await request.json()) as { action?: unknown }
    if (body.action === 'cancel' || body.action === 'retry') action = body.action
  } catch {
    /* default retry */
  }

  const run = await loadRun(runId, userId)
  if (!run) return NextResponse.json({ error: 'Apply run not found' }, { status: 404 })

  const assessment = assessResume(run)

  if (action === 'cancel') {
    if (run.status === 'applied') {
      return NextResponse.json({ error: 'Already submitted — cannot cancel.' }, { status: 409 })
    }
    const admin = createAdminClient()
    const { data: updated, error } = await admin
      .from('apply_runs')
      .update({ status: 'cancelled', finished_at: new Date().toISOString() })
      .eq('id', runId)
      .eq('user_id', userId)
      .select('id, status')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action, run: updated })
  }

  if (!assessment.canResume) {
    return NextResponse.json({ error: assessment.reason, assessment }, { status: 409 })
  }

  try {
    const fresh = await queueServerApply({
      userId,
      jobId: run.job_id,
      submit: run.submit === true,
      force: true,
    })
    const dispatch = await dispatchApplyWorker(fresh.id)
    return NextResponse.json(
      {
        ok: true,
        action,
        previousRunId: run.id,
        assessment,
        run: fresh,
        dispatch,
      },
      { status: 202 },
    )
  } catch (err) {
    if (err instanceof ApplyQueueError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to resume apply' },
      { status: 500 },
    )
  }
}
