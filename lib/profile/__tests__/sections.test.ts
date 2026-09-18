import { describe, expect, it } from 'vitest'
import {
  canonicalSectionId,
  isKnownSection,
  profileSectionAnchor,
  SECTIONS,
} from '@/lib/profile/sections'

describe('profileSectionAnchor', () => {
  it('is unique per section and round-trips known ids', () => {
    const ids = SECTIONS.map(s => s.id)
    const anchors = ids.map(profileSectionAnchor)
    expect(new Set(anchors).size).toBe(ids.length)
    expect(profileSectionAnchor('experience')).toBe('section-experience')
    expect(isKnownSection('experience')).toBe(true)
    expect(isKnownSection('not-a-section')).toBe(false)
  })

  it('keeps documents to resumes + additional documents', () => {
    expect(SECTIONS.filter(s => s.group === 'DOCUMENTS').map(s => s.id)).toEqual([
      'resumes',
      'additionalDocuments',
    ])
    const ids: string[] = SECTIONS.map(s => s.id)
    expect(ids).not.toContain('exportResume')
    expect(ids).not.toContain('attachments')
  })
})

describe('canonicalSectionId', () => {
  it('maps retired document rail items onto the vault pages', () => {
    expect(canonicalSectionId('exportResume')).toBe('resumes')
    expect(canonicalSectionId('attachments')).toBe('additionalDocuments')
    expect(canonicalSectionId('resumes')).toBe('resumes')
    expect(canonicalSectionId('nope')).toBeNull()
  })
})
