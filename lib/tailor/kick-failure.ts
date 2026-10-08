import { createAdminClient } from '@/lib/supabase/admin'
import { getTailorRun, patchTailorRun } from '@/lib/tailor/runs'
import { userFacingTailorError } from '@/lib/tailor/user-error'
import type { TailorProcessLogEntry } from '@/lib/tailor/process-log'

/**
 * Mark a tailor run failed when the worker never started (Trigger enqueue
 * threw and the in-process fallback could not be scheduled). The row must
 * not stay Queued.
 */
export async function recordTailorKickFailure(
  runId: string,
  userId: string,
  err: unknown,
): Promise<string> {
  const technical = err instanceof Error ? err.message : String(err)
  const facing = userFacingTailorError(
    technical ? `Could not start the tailor worker: ${technical}` : 'Could not start the tailor worker',
  )
  try {
    const admin = createAdminClient()
    const run = await getTailorRun(admin, userId, runId)
    const entries: TailorProcessLogEntry[] = [...(run?.process_log ?? [])]
    entries.push({
      id: `kick-fail-${entries.length}`,
      at: new Date().toISOString(),
      label: facing.title,
      detail: facing.message,
      status: 'error',
    })
    await patchTailorRun(admin, runId, {
      status: 'failed',
      error: facing.message,
      process_log: entries,
      finished_at: new Date().toISOString(),
    })
  } catch (patchErr) {
    console.error('[tailor] could not mark run failed', patchErr)
  }
  return facing.message
}
