import type { CreditGrant, CreditUsage } from '@/types'

/**
 * Credit ledger domain — the accounting half of "auto-apply on a monthly
 * credit budget". Pure functions; storage is `credit_grants` / `credit_usages`
 * (migration 028). Pricing per application comes from `lib/apply/credit-cost`.
 *
 * Model: each month mints a `CreditGrant` with a `[periodStart, periodEnd)`
 * window. Usages fall into whichever grant's window contains their timestamp;
 * remaining credits = active-grant amounts minus usages in those windows.
 */

/** Default monthly allowance. Product/pricing TBD — keep here until Stripe lands. */
export const DEFAULT_MONTHLY_CREDITS = 30

const DAY_MS = 86_400_000

/** Inclusive start / exclusive end for a given UTC year + zero-based month. */
export function monthPeriod(year: number, monthIndex: number): {
  periodStart: string
  periodEnd: string
} {
  const start = new Date(Date.UTC(year, monthIndex, 1))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1))
  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  }
}

/** End-of-month boundary for the month containing `asOf` (UTC). */
export function nextPeriodEnd(asOf: string | Date): string {
  const d = asOf instanceof Date ? asOf : new Date(asOf)
  return monthPeriod(d.getUTCFullYear(), d.getUTCMonth()).periodEnd
}

function within(iso: string, grant: CreditGrant): boolean {
  return grant.periodStart <= iso && iso < grant.periodEnd
}

export function grantsActiveAt(grants: CreditGrant[], asOf: string | Date): CreditGrant[] {
  const at = asOf instanceof Date ? asOf.toISOString() : asOf
  return grants.filter((g) => within(at, g))
}

export function totalGranted(grants: CreditGrant[], asOf: string | Date): number {
  return grantsActiveAt(grants, asOf).reduce((sum, g) => sum + g.amount, 0)
}

export function totalUsed(grants: CreditGrant[], usages: CreditUsage[]): number {
  return usages
    .filter((u) => grants.some((g) => within(u.createdAt, g)))
    .reduce((sum, u) => sum + u.cost, 0)
}

export function remaining(grants: CreditGrant[], usages: CreditUsage[], asOf: string | Date): number {
  const active = grantsActiveAt(grants, asOf)
  const used = totalUsed(active, usages)
  return Math.max(0, active.reduce((sum, g) => sum + g.amount, 0) - used)
}

export function canAfford(
  grants: CreditGrant[],
  usages: CreditUsage[],
  asOf: string | Date,
  cost: number,
): boolean {
  return remaining(grants, usages, asOf) >= cost
}

/** Number of applications a budget supports at a given cost (floor). */
export function applicationsAffordable(
  grants: CreditGrant[],
  usages: CreditUsage[],
  asOf: string | Date,
  cost: number,
): number {
  if (cost <= 0) return 0
  return Math.floor(remaining(grants, usages, asOf) / cost)
}

/**
 * The default monthly allowance grant for the month containing `asOf`.
 * Deterministic id so a mint job can be idempotent (upsert on this key).
 */
export function monthlyGrantFor(userId: string, asOf: string | Date = new Date()): CreditGrant {
  const d = asOf instanceof Date ? asOf : new Date(asOf)
  const { periodStart, periodEnd } = monthPeriod(d.getUTCFullYear(), d.getUTCMonth())
  return {
    id: `monthly:${userId}:${periodStart}`,
    userId,
    amount: DEFAULT_MONTHLY_CREDITS,
    periodStart,
    periodEnd,
    kind: 'monthly',
    createdAt: d.toISOString(),
  }
}
