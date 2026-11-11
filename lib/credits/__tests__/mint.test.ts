import { describe, it, expect } from 'vitest'
import { mintRowsFor } from '@/lib/credits/mint'

describe('mintRowsFor', () => {
  it('mints one monthly grant per user for the given month', () => {
    const rows = mintRowsFor(['u1', 'u2'], '2026-01-15T00:00:00.000Z')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      userId: 'u1',
      kind: 'monthly',
      periodStart: '2026-01-01T00:00:00.000Z',
      periodEnd: '2026-02-01T00:00:00.000Z',
    })
    expect(rows[1].userId).toBe('u2')
  })

  it('produces distinct periods for different months', () => {
    const jan = mintRowsFor(['u1'], '2026-01-15T00:00:00.000Z')[0]
    const feb = mintRowsFor(['u1'], '2026-02-15T00:00:00.000Z')[0]
    expect(jan.periodStart).not.toBe(feb.periodStart)
  })
})
