import { fetchCreditSummary, type CreditSummary } from '@/lib/credits/service'
import { describeBudget, describeCredits } from '@/lib/credits/format'
import { DEFAULT_MONTHLY_CREDITS } from '@/lib/credits/ledger'

/**
 * Server component — shows remaining monthly credits and what they buy.
 * Degrades to a "not set up" note until migration 028 is applied, so it's safe
 * to drop into a page before the credit tables exist.
 */
export async function CreditBalanceCard({ userId }: { userId: string }) {
  let summary: CreditSummary | null = null
  try {
    summary = await fetchCreditSummary(userId)
  } catch {
    summary = null
  }

  if (!summary) {
    return (
      <div className="rounded-lg border border-border bg-white p-3 text-sm dark:bg-background">
        <p className="text-muted-foreground">
          Credit tracking isn&apos;t set up yet — applications aren&apos;t metered.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-white p-3 text-sm dark:bg-background">
      <p className="font-medium">{describeBudget(summary.grants, summary.usages, new Date().toISOString())}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Monthly allowance {describeCredits(DEFAULT_MONTHLY_CREDITS)} · 1 credit per public-form apply, 3 per account
        portal.
      </p>
    </div>
  )
}
