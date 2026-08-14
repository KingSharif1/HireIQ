import { describe, expect, it } from 'vitest'
import { canClaimTailorLock, TAILOR_LOCK_STALE_MS } from '@/lib/ai/tailor-lock'

describe('canClaimTailorLock', () => {
  const now = Date.parse('2026-08-14T16:00:00.000Z')

  it('allows a first run and a finished run', () => {
    expect(canClaimTailorLock('not_started', '2026-08-14T15:00:00.000Z', now)).toBe(true)
    expect(canClaimTailorLock('tailored', '2026-08-14T15:00:00.000Z', now)).toBe(true)
    expect(canClaimTailorLock(null, null, now)).toBe(true)
  })

  it('blocks an in-progress lock that is still fresh', () => {
    expect(canClaimTailorLock('in_progress', '2026-08-14T15:59:00.000Z', now)).toBe(false)
  })

  it('allows reclaiming a stale in-progress lock', () => {
    const stale = new Date(now - TAILOR_LOCK_STALE_MS - 1).toISOString()
    expect(canClaimTailorLock('in_progress', stale, now)).toBe(true)
  })
})
