import { after } from 'next/server'
import { createHash } from 'node:crypto'
import { executeGapPhase, executeGeneratePhase } from '@/lib/tailor/execute-run'
import { recordTailorKickFailure } from '@/lib/tailor/kick-failure'
import { tailorRun, type TailorRunPayload } from '@/trigger/tailor-run'

/**
 * How a tailor phase is dispatched.
 *
 * `trigger` — enqueue the Trigger.dev task. Only when the secret can reach a
 * worker: a production/staging key anywhere, or a development key on a machine
 * running `npm run trigger:dev`. A `tr_dev_` key on Vercel never has a worker,
 * so it must not be used (the run would sit in Queued until the stale check).
 *
 * `after` — run inside this Next.js request. `maxDuration` on the tailor routes
 * is 300s, which covers a typical rewrite. Longer runs need Trigger.dev.
 */
export type TailorDispatch = 'trigger' | 'after'

export type TailorKickResult =
  | { via: 'trigger' | 'after' }
  | { via: 'failed'; error: string }

type Env = Record<string, string | undefined>

export function tailorDispatchPlan(env: Env = process.env): TailorDispatch {
  const key = env.TRIGGER_SECRET_KEY?.trim() ?? ''
  if (!key) return 'after'
  const onVercel = env.VERCEL === '1' || Boolean(env.VERCEL_ENV)
  const devKey = key.startsWith('tr_dev_')
  if (devKey && (onVercel || env.NODE_ENV === 'production')) return 'after'
  return 'trigger'
}

/**
 * Kick the durable tailor worker.
 *
 * Production path: enqueue `tailor-run` when a non-dev Trigger.dev key is set.
 * If enqueue throws, fall back to in-process `after()` so the run is not left
 * Queued. If that cannot be scheduled either, mark the run failed with a
 * user-facing message.
 *
 * Dev / missing key: `after()` immediately. Safe on localhost. On Vercel this
 * is bounded by the route `maxDuration` (300s).
 */
export async function kickTailorWorker(
  runId: string,
  userId: string,
  phase: 'gap' | 'generate',
  answers?: Record<string, string>,
): Promise<TailorKickResult> {
  const runPhase = () =>
    phase === 'gap'
      ? executeGapPhase(runId, userId)
      : executeGeneratePhase(runId, userId, answers ?? {})

  const scheduleInProcess = (): TailorKickResult | Promise<TailorKickResult> => {
    after(() =>
      runPhase().catch(err => {
        console.error('[tailor] in-process phase failed', err)
        return recordTailorKickFailure(runId, userId, err)
      }),
    )
    return { via: 'after' }
  }

  if (tailorDispatchPlan() === 'trigger') {
    try {
      const payload: TailorRunPayload = { runId, userId, phase, answers }
      const idempotencyKey = `tailor:${runId}:${phase}:${sha1(answers ?? {})}`
      await tailorRun.trigger(payload, { idempotencyKey })
      return { via: 'trigger' }
    } catch (err) {
      console.error('[tailor] Trigger.dev enqueue failed; running in this request instead', err)
    }
  } else if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    console.warn(
      '[tailor] No production Trigger.dev key — running in-process (300s limit). ' +
        'Set a tr_prod_ TRIGGER_SECRET_KEY on Vercel and run `npm run trigger:deploy`.',
    )
  } else {
    console.warn(
      '[tailor] TRIGGER_SECRET_KEY not set — running phase in-process via after(). ' +
        'Run `npm run trigger:dev` for the durable path.',
    )
  }

  try {
    return await scheduleInProcess()
  } catch (err) {
    const message = await recordTailorKickFailure(runId, userId, err)
    return { via: 'failed', error: message }
  }
}

function sha1(value: Record<string, string>): string {
  return createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 12)
}
