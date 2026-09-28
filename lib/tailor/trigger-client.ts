import { after } from 'next/server'
import { executeGapPhase, executeGeneratePhase } from '@/lib/tailor/execute-run'
import { tailorRun, type TailorRunPayload } from '@/trigger/tailor-run'
import { createHash } from 'node:crypto'

/**
 * Kick the durable tailor worker.
 *
 * Production path: enqueue the Trigger.dev `tailor-run` task (no 120s Vercel
 * ceiling, automatic retries, observability). Requires TRIGGER_SECRET_KEY in
 * the Next.js runtime — set on Vercel for Production/Preview/Development.
 *
 * Dev fallback: if TRIGGER_SECRET_KEY is missing (local dev without
 * `trigger:dev` running), run the phase in-process via `after()`. This keeps
 * `next dev` working standalone; it is NOT safe in production, where after()
 * is capped at 120s.
 */
export async function kickTailorWorker(
  runId: string,
  userId: string,
  phase: 'gap' | 'generate',
  answers?: Record<string, string>
): Promise<{ via: 'trigger' | 'after' }> {
  if (process.env.TRIGGER_SECRET_KEY) {
    const payload: TailorRunPayload = { runId, userId, phase, answers }
    // Same payload → same key, so network retries of the trigger call itself
    // don't queue duplicate runs. Different answers → different key.
    const idempotencyKey = `tailor:${runId}:${phase}:${sha1(answers ?? {})}`
    await tailorRun.trigger(payload, { idempotencyKey })
    return { via: 'trigger' }
  }
  console.warn(
    '[tailor] TRIGGER_SECRET_KEY not set — running phase in-process via after(). ' +
      'Run `npm run trigger:dev` for the durable path.'
  )
  after(() =>
    phase === 'gap'
      ? executeGapPhase(runId, userId)
      : executeGeneratePhase(runId, userId, answers ?? {})
  )
  return { via: 'after' }
}

function sha1(value: Record<string, string>): string {
  return createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 12)
}
