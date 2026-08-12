import { describe, expect, it } from 'vitest'
import { isEntryLevelRole } from '@/lib/extension/entry-level'

describe('isEntryLevelRole', () => {
  it('detects intern / grad / entry', () => {
    expect(isEntryLevelRole('RTK - Junior Software Engineer - Internship', '')).toBe(true)
    expect(isEntryLevelRole('New Grad SWE', 'Looking for recent graduates')).toBe(true)
    expect(isEntryLevelRole('Entry Level Analyst', '')).toBe(true)
  })

  it('rejects mid/senior roles', () => {
    expect(isEntryLevelRole('Senior Software Engineer', '5+ years experience')).toBe(false)
    expect(isEntryLevelRole('Staff Engineer', '')).toBe(false)
  })
})
