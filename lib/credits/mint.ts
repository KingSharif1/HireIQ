import { createAdminClient } from '@/lib/supabase/admin'
import { monthlyGrantFor } from '@/lib/credits/ledger'

/**
 * Monthly credit mint — grants every user the default allowance for the month
 * containing `asOf`. Idempotent via the unique (user_id, period_start, kind)
 * index; the cron route calls this once per day and the upsert no-ops for
 * already-minted months.
 */

export interface MintRow {
  userId: string
  amount: number
  periodStart: string
  periodEnd: string
  kind: 'monthly'
}

export function mintRowsFor(userIds: readonly string[], asOf: string | Date): MintRow[] {
  return userIds.map((id) => {
    const g = monthlyGrantFor(id, asOf)
    return {
      userId: g.userId,
      amount: g.amount,
      periodStart: g.periodStart,
      periodEnd: g.periodEnd,
      kind: g.kind as 'monthly',
    }
  })
}

export async function mintMonthlyCreditsForAllUsers(
  asOf: Date = new Date(),
): Promise<{ minted: number }> {
  const admin = createAdminClient()
  const { data: users } = await admin.from('profiles').select('id')
  const rows = mintRowsFor((users ?? []).map((u) => u.id), asOf)
  if (rows.length === 0) return { minted: 0 }

  const now = new Date().toISOString()
  const { error } = await admin.from('credit_grants').upsert(
    rows.map((r) => ({
      user_id: r.userId,
      amount: r.amount,
      period_start: r.periodStart,
      period_end: r.periodEnd,
      kind: r.kind,
      created_at: now,
    })),
    { onConflict: 'user_id,period_start,kind' },
  )
  if (error) throw new Error(`credit mint failed: ${error.message}`)
  return { minted: rows.length }
}
