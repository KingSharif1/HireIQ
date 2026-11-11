import { describe, it, expect } from 'vitest'
import { describeCredits, describeBudget } from '@/lib/credits/format'
import { monthlyGrantFor } from '@/lib/credits/ledger'
import type { CreditGrant, CreditUsage } from '@/types'

describe('describeCredits', () => {
  it('pluralizes', () => {
    expect(describeCredits(1)).toBe('1 credit')
    expect(describeCredits(30)).toBe('30 credits')
  })
})

describe('describeBudget', () => {
  it('summarizes remaining and affordability', () => {
    const grants: CreditGrant[] = [monthlyGrantFor('u1', '2026-01-15T00:00:00.000Z')] // 30 credits
    const usages: CreditUsage[] = []
    const asOf = '2026-01-20T00:00:00.000Z'
    expect(describeBudget(grants, usages, asOf)).toBe(
      '30 credits left — ~30 quick applies or ~10 account-portal applies',
    )
  })

  it('reflects usage', () => {
    const grants: CreditGrant[] = [monthlyGrantFor('u1', '2026-01-15T00:00:00.000Z')]
    const usages: CreditUsage[] = [
      { id: 'u1', userId: 'u1', cost: 3, kind: 'apply', createdAt: '2026-01-15T00:00:00.000Z' },
    ]
    expect(describeBudget(grants, usages, '2026-01-20T00:00:00.000Z')).toBe(
      '27 credits left — ~27 quick applies or ~9 account-portal applies',
    )
  })
})
