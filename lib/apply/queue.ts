import { createAdminClient } from '@/lib/supabase/admin'
import { assertSavableJobUrl } from '@/lib/extension/job-page'
import { normalizeProfileData } from '@/lib/profile/provenance'
import { resolveApplyIdentity } from '@/lib/extension/apply-identity'
import { ensureAccessTokenForUser } from '@/lib/google/token-access'
import {
  boardFromApplyUrl,
  estimateApplyComplexity,
  type ApplyIdentityPayload,
  type ApplyRunRow,
  type ServerApplyContext,
} from '@/lib/apply/types'
import type { ProfileData } from '@/types'
import { recordAutoApplyUsage } from '@/lib/ai/usage'

export class ApplyQueueError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message)
    this.name = 'ApplyQueueError'
  }
}

function pickUrl(urls: { label: string; url: string }[], pattern: RegExp): string {
  const hit = urls.find(u => pattern.test(u.label) || pattern.test(u.url))
  return hit?.url?.trim() || ''
}

async function buildIdentity(userId: string): Promise<ApplyIdentityPayload> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select(
      'first_name, last_name, email, profile_data, email_tracking_mode, masked_email, gmail_sync_enabled',
    )
    .eq('id', userId)
    .maybeSingle()

  if (!profile) throw new ApplyQueueError('Profile not found', 404)

  const data = normalizeProfileData((profile.profile_data ?? {}) as ProfileData)
  const personal = data.personal
  const profileEmail = (personal.email || profile.email || '').trim()
  const gmailConnected = Boolean(await ensureAccessTokenForUser(userId).catch(() => null))
  const identity = resolveApplyIdentity({
    mode: (profile.email_tracking_mode as 'gmail' | 'masked' | 'off' | null) ?? 'off',
    profileEmail,
    maskedEmail: profile.masked_email,
    gmailConnected,
  })

  return {
    firstName: (personal.firstName || profile.first_name || '').trim(),
    lastName: (personal.lastName || profile.last_name || '').trim(),
    email: (identity.applyEmail || profileEmail).trim(),
    phone: (personal.phone || '').trim(),
    linkedin: pickUrl(data.urls, /linkedin/i),
    website:
      pickUrl(data.urls, /portfolio|website|personal|github\.com|^site$/i) ||
      data.urls.find(u => !/linkedin/i.test(u.label) && !/linkedin/i.test(u.url))?.url?.trim() ||
      '',
  }
}

/**
 * Queue a server auto-apply run for a job owned by the user.
 */
export async function queueServerApply(opts: {
  userId: string
  jobId: string
  /** When true, worker may click Submit. Default false (fill + verify only). */
  submit?: boolean
}): Promise<ApplyRunRow> {
  const admin = createAdminClient()

  const { data: job, error: jobError } = await admin
    .from('jobs')
    .select('id, user_id, apply_url, title, company')
    .eq('id', opts.jobId)
    .eq('user_id', opts.userId)
    .maybeSingle()

  if (jobError || !job) throw new ApplyQueueError('Job not found', 404)

  const applyUrl = (job.apply_url || '').trim()
  if (!applyUrl) throw new ApplyQueueError('This job has no apply URL')

  const urlError = assertSavableJobUrl(applyUrl)
  if (urlError) throw new ApplyQueueError(urlError)

  const host = new URL(applyUrl).hostname.toLowerCase()
  if (host.includes('linkedin.com') || host.includes('indeed.com')) {
    throw new ApplyQueueError(
      'LinkedIn and Indeed auto-submit are blocked. Open the listing and apply manually or with the extension.',
    )
  }

  const { data: app } = await admin
    .from('applications')
    .select('id')
    .eq('user_id', opts.userId)
    .eq('job_id', opts.jobId)
    .maybeSingle()

  const { data: active } = await admin
    .from('apply_runs')
    .select('id, status')
    .eq('user_id', opts.userId)
    .eq('job_id', opts.jobId)
    .in('status', ['queued', 'running'])
    .limit(1)
    .maybeSingle()

  if (active) {
    throw new ApplyQueueError('An auto-apply is already queued or running for this job', 409)
  }

  const board = boardFromApplyUrl(applyUrl)
  const complexity = estimateApplyComplexity(applyUrl)
  const now = new Date().toISOString()

  const { data: run, error } = await admin
    .from('apply_runs')
    .insert({
      user_id: opts.userId,
      job_id: opts.jobId,
      application_id: app?.id ?? null,
      mode: 'server',
      status: 'queued',
      complexity,
      board,
      apply_url: applyUrl,
      submit: Boolean(opts.submit),
      result: {
        jobTitle: job.title,
        company: job.company,
      },
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error || !run) {
    throw new ApplyQueueError(error?.message || 'Failed to queue apply', 500)
  }

  await recordAutoApplyUsage({
    userId: opts.userId,
    runId: run.id,
    complexity,
  })

  if (app?.id) {
    await admin.from('application_events').insert({
      application_id: app.id,
      user_id: opts.userId,
      event_type: 'note',
      meta: {
        kind: 'auto_apply_queued',
        runId: run.id,
        board,
        complexity,
        submit: Boolean(opts.submit),
      },
    })
  }

  return run as ApplyRunRow
}

export async function loadServerApplyContext(runId: string): Promise<ServerApplyContext> {
  const admin = createAdminClient()
  const { data: run, error } = await admin
    .from('apply_runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle()

  if (error || !run) throw new ApplyQueueError('Apply run not found', 404)
  if (!run.apply_url) throw new ApplyQueueError('Apply run missing URL', 400)

  const identity = await buildIdentity(run.user_id)

  const { data: tailored } = await admin
    .from('tailored_resumes')
    .select('pdf_url')
    .eq('user_id', run.user_id)
    .eq('job_id', run.job_id)
    .not('pdf_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const result = (run.result || {}) as Record<string, unknown>

  return {
    runId: run.id,
    applyUrl: run.apply_url,
    board: boardFromApplyUrl(run.apply_url),
    submit: Boolean(run.submit),
    identity,
    resumePdfUrl: tailored?.pdf_url ?? null,
    jobTitle: String(result.jobTitle || ''),
    company: String(result.company || ''),
  }
}

/** Fire-and-forget invoke of Cloud Run (or local worker URL). */
export async function dispatchApplyWorker(runId: string): Promise<{ dispatched: boolean; reason?: string }> {
  const url = process.env.APPLY_WORKER_URL?.trim()
  const secret = process.env.APPLY_WORKER_SECRET?.trim()
  if (!url) return { dispatched: false, reason: 'APPLY_WORKER_URL not set — run stays queued' }
  if (!secret) return { dispatched: false, reason: 'APPLY_WORKER_SECRET not set' }

  const res = await fetch(url.replace(/\/$/, '') + '/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ runId }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { dispatched: false, reason: `worker HTTP ${res.status}: ${text.slice(0, 200)}` }
  }
  return { dispatched: true }
}
