import { after, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createProcessLog } from '@/lib/tailor/process-log'
import {
  failStaleBusyRun,
  getActiveTailorRun,
  insertTailorRun,
  listActiveTailorRuns,
  loadTailoredSnapshot,
} from '@/lib/tailor/runs'
import { executeGapPhase } from '@/lib/tailor/execute-run'
import { isActiveTailorStatus, shouldAttachToRun, shouldKickGapWorker } from '@/lib/tailor/run-types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobId = new URL(request.url).searchParams.get('jobId')
  if (jobId) {
    const found = await getActiveTailorRun(supabase, user.id, jobId)
    const run = found ? await failStaleBusyRun(supabase, found) : null
    const tailored = run ? await loadTailoredSnapshot(supabase, run.tailored_resume_id) : null
    return NextResponse.json({ run: run?.status === 'failed' ? null : run, tailored })
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
        after(() => executeGapPhase(run.id, user.id))
      }
      const tailored = await loadTailoredSnapshot(supabase, run.tailored_resume_id)
      return NextResponse.json({ run, resumed: true, tailored })
    }
  }

  const log = createProcessLog()
  log.step('Queued', 'One tailor session for this job — refresh will attach, not restart')
  const { run, created } = await insertTailorRun(supabase, user.id, jobId, log.entries)

  if (shouldKickGapWorker(run)) {
    after(() => executeGapPhase(run.id, user.id))
  }

  const tailored = await loadTailoredSnapshot(supabase, run.tailored_resume_id)
  return NextResponse.json({ run, resumed: !created, tailored }, { status: created ? 202 : 200 })
}
