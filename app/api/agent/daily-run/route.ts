import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTokenUserId } from '@/lib/extension/tokens'
import { ApplyQueueError, dispatchApplyWorker, queueServerApply } from '@/lib/apply/queue'
import { planDailyRun, type DailyRunCandidate } from '@/lib/apply/daily-run'
import { fetchCreditSummary } from '@/lib/credits/service'
import type { ApplicationStatus } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 10

type ApplicationRow = {
  id: string
  job_id: string | null
  application_status: ApplicationStatus
}
type JobRow = {
  id: string
  company: string | null
  title: string | null
  apply_url: string | null
  extracted_data: { apply_ease?: 'easy' | 'hard' | 'unknown' } | null
}

/**
 * POST /api/agent/daily-run — the "apply to my next N jobs" entry point that a
 * cron or an external agent calls once a day.
 *
 * Auth: a signed-in session OR `Authorization: Bearer <api token>` (api_tokens).
 * Body: { dryRun?: boolean, limit?: number }
 *
 * Idempotent by construction: it plans from the `applying` queue, skips anything
 * already queued today, and honours the credit budget + non-compete block list.
 */
export async function POST(request: Request) {
  // --- auth -------------------------------------------------------------
  let userId: string | null = null
  let via: 'session' | 'token' = 'session'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) userId = user.id

  if (!userId) {
    const auth = request.headers.get('authorization') ?? ''
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
    if (bearer) {
      const tokenUser = await resolveTokenUserId(bearer)
      if (tokenUser) {
        userId = tokenUser
        via = 'token'
      }
    }
  }

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // --- body -------------------------------------------------------------
  let dryRun = false
  let limit = DEFAULT_LIMIT
  try {
    const body = (await request.json()) as { dryRun?: boolean; limit?: number }
    dryRun = body?.dryRun === true
    if (typeof body?.limit === 'number' && Number.isFinite(body.limit)) limit = body.limit
  } catch {
    /* empty body is fine — defaults apply */
  }
  limit = Math.max(1, Math.min(Math.floor(limit), MAX_LIMIT))

  const admin = createAdminClient()

  // --- candidates: applications parked in `applying` --------------------
  const { data: appRows, error: appError } = await admin
    .from('applications')
    .select('id, job_id, application_status')
    .eq('user_id', userId)
    .eq('application_status', 'applying')

  if (appError) {
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }

  const apps = (appRows ?? []) as ApplicationRow[]
  const jobIds = [...new Set(apps.map((a) => a.job_id).filter((id): id is string => Boolean(id)))]

  let jobs: JobRow[] = []
  if (jobIds.length > 0) {
    const { data: jobRows, error: jobError } = await admin
      .from('jobs')
      .select('id, company, title, apply_url, extracted_data')
      .in('id', jobIds)
    if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 })
    jobs = (jobRows ?? []) as JobRow[]
  }
  const jobById = new Map(jobs.map((j) => [j.id, j]))

  const candidates: DailyRunCandidate[] = apps.flatMap((app) => {
    if (!app.job_id) return []
    const job = jobById.get(app.job_id)
    if (!job) return []
    return [
      {
        applicationId: app.id,
        jobId: job.id,
        company: job.company ?? '',
        title: job.title ?? '',
        applyUrl: job.apply_url,
        status: app.application_status,
        applyEase: job.extracted_data?.apply_ease ?? null,
      },
    ]
  })

  // --- already queued today (idempotency) -------------------------------
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const { data: runRows } = await admin
    .from('apply_runs')
    .select('application_id')
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString())
    .not('application_id', 'is', null)
  const alreadyQueuedToday = (runRows ?? [])
    .map((r) => r.application_id as string | null)
    .filter((id): id is string => Boolean(id))

  // --- credit budget ----------------------------------------------------
  const creditsEnabled = process.env.CREDITS_ENABLED === '1'
  let creditsRemaining = Number.POSITIVE_INFINITY
  if (creditsEnabled) {
    try {
      const summary = await fetchCreditSummary(userId)
      creditsRemaining = summary.remaining
    } catch (err) {
      return NextResponse.json(
        {
          error:
            'Credit ledger unavailable — apply migration 028_credits.sql, or unset CREDITS_ENABLED to run unbudgeted.',
          detail: err instanceof Error ? err.message : undefined,
        },
        { status: 503 },
      )
    }
  }

  // --- non-compete / stop-rule block list -------------------------------
  const { data: profile } = await admin
    .from('profiles')
    .select('profile_data')
    .eq('id', userId)
    .maybeSingle()
  const profileData = (profile?.profile_data ?? {}) as { blockedCompanies?: unknown }
  const blockedCompanies = Array.isArray(profileData.blockedCompanies)
    ? profileData.blockedCompanies.filter((c): c is string => typeof c === 'string')
    : []

  const plan = planDailyRun(candidates, {
    limit,
    creditsRemaining,
    alreadyQueuedToday,
    blockedCompanies,
  })

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      via,
      creditsEnabled,
      creditsRemaining: Number.isFinite(plan.creditsRemaining) ? plan.creditsRemaining : null,
      plan,
    })
  }

  // --- queue ------------------------------------------------------------
  const results: Array<{
    applicationId: string
    jobId: string
    ok: boolean
    runId?: string
    dispatched?: boolean
    error?: string
  }> = []

  for (const { candidate } of plan.queued) {
    try {
      const run = await queueServerApply({ userId, jobId: candidate.jobId, submit: false })
      const dispatch = await dispatchApplyWorker(run.id)
      results.push({
        applicationId: candidate.applicationId,
        jobId: candidate.jobId,
        ok: true,
        runId: run.id,
        dispatched: dispatch.dispatched,
      })
    } catch (err) {
      results.push({
        applicationId: candidate.applicationId,
        jobId: candidate.jobId,
        ok: false,
        error:
          err instanceof ApplyQueueError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'queue failed',
      })
    }
  }

  const queuedOk = results.filter((r) => r.ok).length
  return NextResponse.json(
    {
      ok: queuedOk > 0 || results.length === 0,
      dryRun: false,
      via,
      creditsEnabled,
      creditsRemaining: Number.isFinite(plan.creditsRemaining) ? plan.creditsRemaining : null,
      plan: { skipped: plan.skipped, creditsUsed: plan.creditsUsed, stopReason: plan.stopReason },
      results,
    },
    { status: 202 },
  )
}
