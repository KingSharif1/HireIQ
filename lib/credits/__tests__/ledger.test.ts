import { describe, it, expect } from 'vitest'
import {
  monthPeriod,
  nextPeriodEnd,
  remaining,
  canAfford,
  totalGranted,
  totalUsed,
  applicationsAffordable,
  grantsActiveAt,
  monthlyGrantFor,
  DEFAULT_MONTHLY_CREDITS,
} from '@/lib/credits/ledger'
import type { CreditGrant, CreditUsage } from '@/types'

function grant(overrides: Partial<CreditGrant> = {}): CreditGrant {
  return {
    id: 'g1',
    userId: 'u1',
    amount: 10,
    periodStart: '2026-01-01T00:00:00.000Z',
    periodEnd: '2026-02-01T00:00:00.000Z',
    kind: 'monthly',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function usage(overrides: Partial<CreditUsage> = {}): CreditUsage {
  return {
    id: 'u1',
    userId: 'u1',
    cost: 3,
    kind: 'apply',
    createdAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('monthPeriod / nextPeriodEnd', () => {
  it('computes UTC month boundaries with year rollover', () => {
    expect(monthPeriod(2026, 0)).toEqual({
      periodStart: '2026-01-01T00:00:00.000Z',
      periodEnd: '2026-02-01T00:00:00.000Z',
    })
    expect(monthPeriod(2026, 11).periodEnd).toBe('2027-01-01T00:00:00.000Z')
  })

  it('nextPeriodEnd returns end of the month containing a date', () => {
    expect(nextPeriodEnd('2026-01-15T12:00:00.000Z')).toBe('2026-02-01T00:00:00.000Z')
  })
})

describe('remaining / canAfford', () => {
  it('subtracts only usages inside active grant windows', () => {
    const grants = [grant({ amount: 10 })]
    const usages = [
      usage({ cost: 3, createdAt: '2026-01-15T00:00:00.000Z' }),
      usage({ cost: 5, createdAt: '2026-03-01T00:00:00.000Z' }), // outside → ignored
    ]
    expect(totalUsed(grantsActiveAt(grants, '2026-01-20T00:00:00.000Z'), usages)).toBe(3)
    expect(remaining(grants, usages, '2026-01-20T00:00:00.000Z')).toBe(7)
  })

  it('clamps remaining at 0', () => {
    const grants = [grant({ amount: 2 })]
    const usages = [usage({ cost: 5 })]
    expect(remaining(grants, usages, '2026-01-20T00:00:00.000Z')).toBe(0)
  })

  it('canAfford is true only with enough credits', () => {
    const grants = [grant({ amount: 10 })]
    const usages = [usage({ cost: 8 })]
    const asOf = '2026-01-20T00:00:00.000Z'
    expect(canAfford(grants, usages, asOf, 1)).toBe(true)
    expect(canAfford(grants, usages, asOf, 3)).toBe(false)
  })

  it('ignores expired grants', () => {
    const grants = [
      grant({ id: 'old', periodStart: '2025-12-01T00:00:00.000Z', periodEnd: '2026-01-01T00:00:00.000Z', amount: 100 }),
      grant({ id: 'cur', amount: 10 }),
    ]
    expect(totalGranted(grants, '2026-01-20T00:00:00.000Z')).toBe(10)
  })

  it('applicationsAffordable floors by cost', () => {
    const grants = [grant({ amount: 10 })]
    expect(applicationsAffordable(grants, [], '2026-01-20T00:00:00.000Z', 3)).toBe(3)
    expect(applicationsAffordable(grants, [], '2026-01-20T00:00:00.000Z', 0)).toBe(0)
  })

  it('exposes a default monthly allowance', () => {
    expect(DEFAULT_MONTHLY_CREDITS).toBeGreaterThan(0)
  })

  it('mints a deterministic monthly grant', () => {
    const g = monthlyGrantFor('u1', '2026-01-15T00:00:00.000Z')
    expect(g.amount).toBe(DEFAULT_MONTHLY_CREDITS)
    expect(g.kind).toBe('monthly')
    expect(g.periodStart).toBe('2026-01-01T00:00:00.000Z')
    expect(g.periodEnd).toBe('2026-02-01T00:00:00.000Z')
    // Idempotent key for a monthly mint job.
    expect(monthlyGrantFor('u1', '2026-01-20T00:00:00.000Z').id).toBe(g.id)
    expect(monthlyGrantFor('u1', '2026-02-01T00:00:00.000Z').id).not.toBe(g.id)
  })
})
