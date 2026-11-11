import { applicationsAffordable, remaining } from '@/lib/credits/ledger'
import type { CreditGrant, CreditUsage } from '@/types'

/** "30 credits" / "1 credit". */
export function describeCredits(n: number): string {
  return `${n} credit${n === 1 ? '' : 's'}`
}

/**
 * One-line budget summary for the UI: remaining credits + what that buys at the
 * two price points (1 = public form, 3 = account portal).
 */
export function describeBudget(
  grants: CreditGrant[],
  usages: CreditUsage[],
  asOf: string | Date,
): string {
  const r = remaining(grants, usages, asOf)
  const quick = applicationsAffordable(grants, usages, asOf, 1)
  const hard = applicationsAffordable(grants, usages, asOf, 3)
  return `${describeCredits(r)} left — ~${quick} quick applies or ~${hard} account-portal applies`
}
