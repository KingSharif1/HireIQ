import { task, logger } from '@trigger.dev/sdk'

/**
 * Placeholder smoke-test task.
 *
 * Purpose: verify the Trigger.dev pipeline end-to-end (local dev → deploy →
 * dashboard run) BEFORE the real tailor worker lands. Delete or replace this
 * file when the durable tailor-run task is implemented (see docs/TRIGGER.md).
 *
 * Trigger from the app:
 *   import { healthcheck } from "@/trigger/healthcheck";
 *   await healthcheck.trigger({ note: "hello" });
 */
export const healthcheck = task({
  id: 'healthcheck',
  maxDuration: 60,
  run: async (payload: { note?: string }) => {
    logger.log('Trigger.dev pipeline is live', { note: payload.note ?? 'none' })
    return { ok: true, at: new Date().toISOString() }
  },
})
