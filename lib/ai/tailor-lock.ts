import type { SupabaseClient } from '@supabase/supabase-js'
import type { TailoringStatus } from '@/types'

/** If a lambda dies mid-tailor, allow a new claim after this. */
export const TAILOR_LOCK_STALE_MS = 3 * 60 * 1000

export function canClaimTailorLock(
  status: string | null | undefined,
  updatedAtIso: string | null | undefined,
  now = Date.now(),
): boolean {
  if (status !== 'in_progress') return true
  if (!updatedAtIso) return true
  const updated = Date.parse(updatedAtIso)
  if (!Number.isFinite(updated)) return true
  return now - updated > TAILOR_LOCK_STALE_MS
}

export async function claimTailorJob(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
): Promise<{ ok: true; previousStatus: TailoringStatus } | { ok: false }> {
  const { data: current } = await supabase
    .from('jobs')
    .select('tailoring_status, updated_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!current) return { ok: false }
  if (!canClaimTailorLock(current.tailoring_status, current.updated_at)) {
    return { ok: false }
  }

  const staleIso = new Date(Date.now() - TAILOR_LOCK_STALE_MS).toISOString()
  const { data: claimed } = await supabase
    .from('jobs')
    .update({ tailoring_status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('user_id', userId)
    .or(`tailoring_status.neq.in_progress,updated_at.lt."${staleIso}"`)
    .select('id')
    .maybeSingle()

  if (!claimed) return { ok: false }
  const previousStatus =
    current.tailoring_status === 'tailored' || current.tailoring_status === 'in_progress'
      ? current.tailoring_status
      : 'not_started'
  return { ok: true, previousStatus }
}

export async function releaseTailorJob(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  status: TailoringStatus,
): Promise<void> {
  await supabase
    .from('jobs')
    .update({ tailoring_status: status, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('user_id', userId)
}
