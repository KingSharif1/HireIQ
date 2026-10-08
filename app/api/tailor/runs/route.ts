import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createProcessLog } from '@/lib/tailor/process-log'
import { failStaleBusyRun, getActiveTailorRun, getLatestTailorRun, getTailorRun, insertTailorRun, listActiveTailorRuns, loadTailoredSnapshot } from '@/lib/tailor/runs'
import { kickTailorWorker } from '@/lib/tailor/trigger-client'
import { isActiveTailorStatus, shouldAttachToRun, shouldKickGapWorker } from '@/lib/tailor/run-types'

export const runtime = 'nodejs'
/** In-process fallback ceiling. Trigger.dev prod is unbounded by this. */
export const maxDuration = 300

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobId = new URL(request.url).searchParams.get('jobId')
  if (jobId) {
    const found = await getLatestTailorRun(supabase, user.id, jobId)
    const run = found ? await failStaleBusyRun(supabase, found) : null
    const tailored = run ? await loadTailoredSnapshot(supabase, run.tailored_resume_id) : null
    return NextResponse.json({ run, tailored })
  }
  const listed = await listActiveTailorRuns(supabase, user.id)
  const runs = []
  for (const row of listed) {
    const next = await failStaleBusyRun(supabase, row)
    if (next.status !== 'failed') runs.push(next)
  }
  return NextResponse.json({ runs })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { jobId?: string }
  const jobId = body.jobId
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const existing = await getActiveTailorRun(supabase, user.id, jobId)
  if (existing && (isActiveTailorStatus(existing.status) || existing.status === 'needs_review')) {
    const run = await failStaleBusyRun(supabase, existing)
    if (run.status !== 'failed' && shouldAttachToRun(run.status)) {
      if (shouldKickGapWorker(run)) {
        const failed = await kickGapOrFail(supabase, user.id, run)
        if (failed) return failed
      }
      const tailored = await loadTailoredSnapshot(supabase, run.tailored_resume_id)
      return NextResponse.json({ run, resumed: true, tailored })
    }
  }

  const log = createProcessLog()
  log.step('Queued', 'We’ll keep going if you leave this page')
  const { run, created } = await insertTailorRun(supabase, user.id, jobId, log.entries)

  if (shouldKickGapWorker(run)) {
    const failed = await kickGapOrFail(supabase, user.id, run)
    if (failed) return failed
  }

  const tailored = await loadTailoredSnapshot(supabase, run.tailored_resume_id)
  return NextResponse.json({ run, resumed: !created, tailored }, { status: created ? 202 : 200 })
}

async function kickGapOrFail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  run: { id: string },
) {
  const kicked = await kickTailorWorker(run.id, userId, 'gap')
  if (kicked.via !== 'failed') return null
  const failed = await getTailorRun(supabase, userId, run.id)
  return NextResponse.json(
    { error: kicked.error, run: failed ?? { ...run, status: 'failed', error: kicked.error } },
    { status: 502 },
  )
}
