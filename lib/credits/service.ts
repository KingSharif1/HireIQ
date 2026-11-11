import { createAdminClient } from '@/lib/supabase/admin'
import { canAfford, remaining } from '@/lib/credits/ledger'
import type { CreditGrant, CreditUsage } from '@/types'

/**
 * Credit ledger service — reads `credit_grants` / `credit_usages` (migration 028)
 * and applies the pure ledger math. Gated in callers behind CREDITS_ENABLED until
 * 028 is applied, so the apply flow keeps working while credits are off.
 */

export class InsufficientCreditsError extends Error {
  constructor(
    readonly remaining: number,
    readonly cost: number,
  ) {
    super(`Not enough credits — need ${cost}, have ${remaining}`)
    this.name = 'InsufficientCreditsError'
  }
}

export interface CreditSummary {
  grants: CreditGrant[]
  usages: CreditUsage[]
  remaining: number
}

type GrantRow = {
  id: string
  user_id: string
  amount: number
  period_start: string
  period_end: string
  kind: CreditGrant['kind']
  created_at: string
}

type UsageRow = {
  id: string
  user_id: string
  cost: number
  kind: CreditUsage['kind']
  job_application_id: string | null
  created_at: string
}

export async function fetchCreditSummary(
  userId: string,
  asOf: string = new Date().toISOString(),
): Promise<CreditSummary> {
  const admin = createAdminClient()
  const [{ data: grantRows }, { data: usageRows }] = await Promise.all([
    admin
      .from('credit_grants')
      .select('id, user_id, amount, period_start, period_end, kind, created_at')
      .eq('user_id', userId),
    admin
      .from('credit_usages')
      .select('id, user_id, cost, kind, job_application_id, created_at')
      .eq('user_id', userId),
  ])

  const grants: CreditGrant[] = (grantRows as GrantRow[] | null ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    amount: r.amount,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    kind: r.kind,
    createdAt: r.created_at,
  }))
  const usages: CreditUsage[] = (usageRows as UsageRow[] | null ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    cost: r.cost,
    kind: r.kind,
    jobApplicationId: r.job_application_id,
    createdAt: r.created_at,
  }))

  return { grants, usages, remaining: remaining(grants, usages, asOf) }
}

/** Throws InsufficientCreditsError when the user can't cover `cost`. */
export async function assertCanAfford(
  userId: string,
  cost: number,
  asOf: string = new Date().toISOString(),
): Promise<CreditSummary> {
  const summary = await fetchCreditSummary(userId, asOf)
  if (!canAfford(summary.grants, summary.usages, asOf, cost)) {
    throw new InsufficientCreditsError(summary.remaining, cost)
  }
  return summary
}

export async function recordCreditUsage(
  userId: string,
  opts: { cost: number; kind: CreditUsage['kind']; jobApplicationId?: string | null },
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('credit_usages').insert({
    user_id: userId,
    cost: opts.cost,
    kind: opts.kind,
    job_application_id: opts.jobApplicationId ?? null,
  })
  if (error) throw new Error(`credit usage insert failed: ${error.message}`)
}

/**
 * Atomic debit via the `debit_credits` RPC (migration 028): checks can-afford
 * and inserts the usage in one transaction, so concurrent applies can't
 * overspend. Returns the new remaining balance.
 */
export async function debitCreditsAtomic(
  userId: string,
  opts: { cost: number; kind: CreditUsage['kind']; jobApplicationId?: string | null },
): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('debit_credits', {
    p_user_id: userId,
    p_cost: opts.cost,
    p_kind: opts.kind,
    p_job_application_id: opts.jobApplicationId ?? null,
  })
  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('insufficient_credits')) {
      const have = Number(msg.match(/have=(\d+)/)?.[1] ?? 0)
      throw new InsufficientCreditsError(have, opts.cost)
    }
    throw new Error(`debit_credits failed: ${msg}`)
  }
  return typeof data === 'number' ? data : 0
}
