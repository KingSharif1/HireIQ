import { describe, expect, it } from 'vitest'
import { shouldAutoStartTailor } from '@/lib/tailor/auto-start'

describe('shouldAutoStartTailor', () => {
  it('starts only when this tab has never run this job', () => {
    expect(shouldAutoStartTailor(null)).toBe(true)
    expect(shouldAutoStartTailor('running')).toBe(false)
    expect(shouldAutoStartTailor('done')).toBe(false)
  })

  it('never auto-starts after a remount mid-run or after success (the 132-version loop)', () => {
    // Simulate 132 router.refresh remounts after each complete.
    let flag: 'running' | 'done' | null = null
    let starts = 0
    for (let i = 0; i < 132; i++) {
      if (shouldAutoStartTailor(flag)) {
        starts += 1
        flag = 'running'
      }
      flag = 'done'
    }
    expect(starts).toBe(1)
  })
})
