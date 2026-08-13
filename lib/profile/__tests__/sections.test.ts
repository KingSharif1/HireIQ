import { describe, expect, it } from 'vitest'
import { isKnownSection, profileSectionAnchor, SECTIONS } from '@/lib/profile/sections'

describe('profileSectionAnchor', () => {
  it('is unique per section and round-trips known ids', () => {
    const ids = SECTIONS.map(s => s.id)
    const anchors = ids.map(profileSectionAnchor)
    expect(new Set(anchors).size).toBe(ids.length)
    expect(profileSectionAnchor('experience')).toBe('section-experience')
    expect(isKnownSection('experience')).toBe(true)
    expect(isKnownSection('not-a-section')).toBe(false)
  })
})
