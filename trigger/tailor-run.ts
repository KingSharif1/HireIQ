import { task, logger } from '@trigger.dev/sdk'
import { executeGapPhase, executeGeneratePhase } from '@/lib/tailor/execute-run'
import { sumUsageForTailorRun } from '@/lib/ai/usage'

/**
 * Durable tailor worker — the fix for "Tailor with AI" dying in production.
 *
 * Preferred path: this task on Trigger.dev (10 minute ceiling, retries, logs).
 * The Next.js routes fall back to in-process `after()` only when there is no
 * production key (or enqueue throws). That fallback is capped at the route
 * `maxDuration` of 300s. A `tr_dev_` key on Vercel is ignored so the run is
 * not left Queued waiting for a worker that is not there.
 *
 * Payload is small on purpose — the task re-reads job + profile from Supabase.
 *
 * Idempotency: re-entering is safe. executeGapPhase no-ops unless the run is
 * still in `analyzing_gaps` (claimGapPhase is atomic), and executeGeneratePhase
 * no-ops on failed/cancelled runs. Trigger-level dedupe is applied at the
 * call site via idempotencyKey. Retries (3 attempts, backoff) only matter for
 * infra failures — domain failures are recorded on the run row by failRun()
 * inside the phases and do not throw.
 *
 * Progress: the phases patch `process_log` on the tailor run row as they go,
 * which the existing TailorProcessLog UI already polls — no UI changes needed.
 * Those patches also keep `updated_at` fresh so the stale-sweeper doesn't mark
 * a healthy long run as failed.
 */
export type TailorRunPayload = {
  runId: string
  userId: string
  /** 'gap' runs gap analysis then chains into generate; 'generate' is the weave/legacy path. */
  phase: 'gap' | 'generate'
  answers?: Record<string, string>
}

export const tailorRun = task({
  id: 'tailor-run',
  // Typical run is 2–4 min of LLM calls; 10 min is a generous ceiling.
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: TailorRunPayload, { ctx }) => {
    const { runId, userId, phase } = payload
    const answers = payload.answers ?? {}
    const attempt = ctx.attempt.number
    const startedAt = Date.now()

    logger.log('tailor-run start', { runId, phase, attempt, run: ctx.run.id })

    try {
      if (phase === 'gap') {
        // Gap phase chains into generate internally once context is ready.
        await executeGapPhase(runId, userId)
      } else {
        await executeGeneratePhase(runId, userId, answers)
      }
    } catch (err) {
      // Unexpected infra failure (domain failures are recorded on the run row
      // by failRun() and don't reach here). Log and rethrow so Trigger.dev
      // retries; the dashboard records the terminal failure after attempts
      // are exhausted.
      logger.error('tailor-run phase threw', {
        runId,
        phase,
        attempt,
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }

    const durationMs = Date.now() - startedAt
    const usage = await sumUsageForTailorRun(runId).catch(err => {
      logger.warn('tailor-run usage summary failed', {
        runId,
        error: err instanceof Error ? err.message : String(err),
      })
      return { requests: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 }
    })

    logger.log('tailor-run complete', {
      runId,
      phase,
      attempt,
      durationMs,
      aiRequests: usage.requests,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd: Number(usage.estimatedCostUsd.toFixed(4)),
    })

    return {
      ok: true,
      runId,
      phase,
      attempt,
      durationMs,
      usage,
    }
  },
})
