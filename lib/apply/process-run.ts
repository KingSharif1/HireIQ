import { createAdminClient } from '@/lib/supabase/admin'
import { loadServerApplyContext } from '@/lib/apply/queue'
import { runServerApply } from '@/lib/apply/server-apply'
import { setApplicationStatus } from '@/lib/applications/status'
import {
  createInitialApplyProgress,
  type ApplyProgress,
  type ApplyRunStatus,
} from '@/lib/apply/types'

/**
 * Claim a queued run (or a specific id) and execute Playwright apply.
 * Intended for Cloud Run / local worker with service-role env.
 */
export async function processApplyRun(runId: string): Promise<{
  runId: string
  status: ApplyRunStatus
  error?: string
}> {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const initialProgress = createInitialApplyProgress()

  const { data: claimed, error: claimError } = await admin
    .from('apply_runs')
    .update({
      status: 'running',
      started_at: now,
      updated_at: now,
      error: null,
      result: {
        progress: initialProgress,
      },
    })
    .eq('id', runId)
    .in('status', ['queued'])
    .select('id, user_id, application_id, job_id, result')
    .maybeSingle()

  if (claimError) {
    return { runId, status: 'failed', error: claimError.message }
  }
  if (!claimed) {
    const { data: existing } = await admin
      .from('apply_runs')
      .select('status')
      .eq('id', runId)
      .maybeSingle()
    return {
      runId,
      status: (existing?.status as ApplyRunStatus) || 'failed',
      error: existing ? `Run already ${existing.status}` : 'Run not found',
    }
  }

  const baseResult = (claimed.result || {}) as Record<string, unknown>

  const writeProgress = async (progress: ApplyProgress) => {
    await admin
      .from('apply_runs')
      .update({
        result: {
          ...baseResult,
          progress,
          filled: progress.filled,
          notes: progress.notes,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', runId)
  }

  try {
    const ctx = await loadServerApplyContext(runId)
    const outcome = await runServerApply({
      ...ctx,
      onProgress: writeProgress,
    })
    const finished = new Date().toISOString()

    await admin
      .from('apply_runs')
      .update({
        status: outcome.status,
        error: outcome.error ?? null,
        result: {
          ...baseResult,
          filled: outcome.filled,
          notes: outcome.notes,
          finalUrl: outcome.finalUrl,
          submitted: outcome.submitted ?? false,
          board: ctx.board,
          jobTitle: ctx.jobTitle,
          company: ctx.company,
          progress: outcome.progress,
        },
        finished_at: finished,
        updated_at: finished,
      })
      .eq('id', runId)

    if (claimed.application_id) {
      await admin.from('application_events').insert({
        application_id: claimed.application_id,
        user_id: claimed.user_id,
        event_type: 'note',
        meta: {
          kind: 'auto_apply_finished',
          runId,
          status: outcome.status,
          filled: outcome.filled,
          notes: outcome.notes,
          submitted: outcome.submitted ?? false,
        },
      })

      if (outcome.status === 'applied') {
        await setApplicationStatus(admin, {
          userId: claimed.user_id,
          applicationId: claimed.application_id,
          jobId: claimed.job_id,
          status: 'applied',
          meta: { via: 'server_auto_apply', runId },
        })
      } else if (outcome.status === 'needs_user') {
        await setApplicationStatus(admin, {
          userId: claimed.user_id,
          applicationId: claimed.application_id,
          jobId: claimed.job_id,
          status: 'applying',
          meta: { via: 'server_auto_apply', runId, phase: outcome.status },
        }).catch(() => undefined)
      }
    }

    return { runId, status: outcome.status, error: outcome.error }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Apply failed'
    const finished = new Date().toISOString()
    await admin
      .from('apply_runs')
      .update({
        status: 'failed',
        error: message,
        finished_at: finished,
        updated_at: finished,
      })
      .eq('id', runId)
    return { runId, status: 'failed', error: message }
  }
}
