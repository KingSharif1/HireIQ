import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTokenUserId } from '@/lib/extension/tokens'
import {
  computeFollowUps,
  followUpDraft,
  type FollowUpCandidate,
  type FollowUpItem,
} from '@/lib/applications/follow-ups'
import type { ApplicationStatus } from '@/types'

export const dynamic = 'force-dynamic'

const MAX_SNOOZE_DAYS = 60
const DEFAULT_SNOOZE_DAYS = 7
const DONE_SNOOZE_DAYS = 30

type AppRow = {
  id: string
  job_id: string | null
  status: ApplicationStatus
  applied_at: string | null
  follow_up_at: string | null
}
type JobRow = { id: string; company: string | null; title: string | null }

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

function present(item: FollowUpItem) {
  return {
    applicationId: item.candidate.applicationId,
    company: item.candidate.company,
    title: item.candidate.title,
    status: item.candidate.status,
    appliedAt: item.candidate.appliedAt,
    dueAt: item.dueAt,
    daysUntilDue: item.daysUntilDue,
    draft: followUpDraft(item),
  }
}

/**
 * GET /api/agent/follow-ups — applications due for a nudge (and the next week).
 * Auth: session or `Authorization: Bearer <api_token>`.
 */
export async function GET(request: Request) {
  const userId = await resolveUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: appRows, error } = await admin
    .from('applications')
    .select('id, job_id, status, applied_at, follow_up_at')
    .eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const apps = (appRows ?? []) as AppRow[]

  const jobIds = [...new Set(apps.map((a) => a.job_id).filter((id): id is string => Boolean(id)))]
  let jobs: JobRow[] = []
  if (jobIds.length > 0) {
    const { data: jobRows } = await admin.from('jobs').select('id, company, title').in('id', jobIds)
    jobs = (jobRows ?? []) as JobRow[]
  }
  const jobById = new Map(jobs.map((j) => [j.id, j]))

  // Replied applications never need a nudge. Unknown schema → no reply detection.
  const replied = new Set<string>()
  const { data: inbound, error: inboundError } = await admin
    .from('inbound_email_events')
    .select('application_id')
    .eq('user_id', userId)
    .not('application_id', 'is', null)
  if (!inboundError) {
    for (const row of (inbound ?? []) as Array<{ application_id: string | null }>) {
      if (row.application_id) replied.add(row.application_id)
    }
  }

  const candidates: FollowUpCandidate[] = apps.map((app) => {
    const job = app.job_id ? jobById.get(app.job_id) : undefined
    return {
      applicationId: app.id,
      company: job?.company ?? '',
      title: job?.title ?? '',
      status: app.status,
      appliedAt: app.applied_at,
      followUpAt: app.follow_up_at,
      hasReply: replied.has(app.id),
    }
  })

  const plan = computeFollowUps(candidates)

  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    counts: { due: plan.due.length, upcoming: plan.upcoming.length },
    due: plan.due.map(present),
    upcoming: plan.upcoming.map(present),
    skipped: plan.skipped.map((s) => ({
      applicationId: s.candidate.applicationId,
      company: s.candidate.company,
      reason: s.reason,
    })),
  })
}

/**
 * POST /api/agent/follow-ups — snooze or dismiss one follow-up.
 * Body: { applicationId: string, action?: 'snooze' | 'done', days?: number }
 *  - snooze (default 7 days) pushes the date out;
 *  - done records that the nudge was sent and re-arms in 30 days.
 */
export async function POST(request: Request) {
  const userId = await resolveUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let applicationId = ''
  let action: 'snooze' | 'done' = 'snooze'
  let days = DEFAULT_SNOOZE_DAYS
  try {
    const body = (await request.json()) as {
      applicationId?: unknown
      action?: unknown
      days?: unknown
    }
    if (typeof body.applicationId === 'string') applicationId = body.applicationId
    if (body.action === 'done' || body.action === 'snooze') action = body.action
    if (typeof body.days === 'number' && Number.isFinite(body.days)) days = body.days
  } catch {
    /* default action below */
  }

  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
  }

  const forwardDays =
    action === 'done'
      ? DONE_SNOOZE_DAYS
      : Math.max(1, Math.min(Math.floor(days), MAX_SNOOZE_DAYS))

  const followUpAt = new Date(Date.now() + forwardDays * 24 * 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  const { data: updated, error } = await admin
    .from('applications')
    .update({ follow_up_at: followUpAt })
    .eq('id', applicationId)
    .eq('user_id', userId)
    .select('id, follow_up_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    applicationId: updated.id,
    followUpAt: updated.follow_up_at,
    action,
  })
}
