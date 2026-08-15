import { describe, expect, it } from 'vitest'
import {
  enrichmentDefaults,
  suggestionNeedsFollowUp,
  validateEnrichment,
} from '@/lib/profile/suggestion-followup'
import { acceptSuggestion, getProvenanceLabel } from '@/lib/profile/provenance'
import { emptyProfileData } from '@/lib/profile/data'
import type { PendingSuggestion } from '@/types'

function baseSuggestion(patch: Partial<PendingSuggestion> = {}): PendingSuggestion {
  return {
    id: 's1',
    section: 'experience',
    proposedText: 'Built an internal billing tool that cut invoice time by 40%.',
    reason: 'From gap answer',
    sourceTailoredResumeId: 't1',
    jobLabel: 'Engineer @ Harper',
    createdAt: new Date().toISOString(),
    ...patch,
  }
}

describe('suggestionNeedsFollowUp', () => {
  it('requires follow-up for new experience (no target)', () => {
    expect(suggestionNeedsFollowUp(baseSuggestion())).toBe(true)
  })

  it('skips follow-up when adding bullet to existing experience', () => {
    expect(suggestionNeedsFollowUp(baseSuggestion({ targetEntryId: 'exp-1' }))).toBe(false)
  })

  it('skips follow-up for complete GitHub newProject', () => {
    expect(
      suggestionNeedsFollowUp(
        baseSuggestion({
          section: 'projects',
          source: 'github',
          newProject: {
            name: 'hireiq',
            description: 'app',
            github: 'https://github.com/x/hireiq',
            technologies: ['TS'],
            bullets: ['Shipped profile unify for master resume.'],
          },
        })
      )
    ).toBe(false)
  })

  it('requires follow-up for thin newProject', () => {
    expect(
      suggestionNeedsFollowUp(
        baseSuggestion({
          section: 'projects',
          newProject: {
            name: '',
            description: '',
            github: '',
            technologies: [],
            bullets: [],
          },
        })
      )
    ).toBe(true)
  })
})

describe('enrichmentDefaults', () => {
  it('prefills a new employer from Q&A routing', () => {
    const defaults = enrichmentDefaults(
      baseSuggestion({ newExperience: { company: 'IRC' } })
    )
    expect(defaults.company).toBe('IRC')
    expect(defaults.entryKind).toBe('experience')
  })
})

describe('validateEnrichment', () => {
  it('requires title and a bullet', () => {
    expect(validateEnrichment({ entryKind: 'experience', title: '', bullets: ['x'] })).toMatch(/Title/)
    expect(validateEnrichment({ entryKind: 'project', title: 'App', bullets: [''] })).toMatch(/bullet/)
    expect(validateEnrichment({ entryKind: 'experience', title: 'Eng', bullets: ['Did X'] })).toBeNull()
  })
})

describe('acceptSuggestion with enrichment', () => {
  it('creates a new experience from follow-up sheet', () => {
    const suggestion = baseSuggestion()
    const data = { ...emptyProfileData(), pendingSuggestions: [suggestion] }
    const next = acceptSuggestion(data, 's1', {
      entryKind: 'experience',
      title: 'Platform Engineer',
      company: 'Harper',
      startDate: '2024-01',
      current: true,
      bullets: [suggestion.proposedText],
    })
    expect(next.pendingSuggestions).toHaveLength(0)
    expect(next.experience).toHaveLength(1)
    expect(next.experience[0].title).toBe('Platform Engineer')
    expect(next.experience[0].company).toBe('Harper')
    const bulletId = next.experience[0].bulletIds![0]
    expect(getProvenanceLabel(next.provenance?.[bulletId])).toBe('From Engineer @ Harper')
  })

  it('creates a project when entryKind is project', () => {
    const suggestion = baseSuggestion({ section: 'projects' })
    const defaults = enrichmentDefaults(suggestion)
    const data = { ...emptyProfileData(), pendingSuggestions: [suggestion] }
    const next = acceptSuggestion(data, 's1', {
      ...defaults,
      entryKind: 'project',
      title: 'Billing tool',
      bullets: ['Built billing tool'],
    })
    expect(next.projects).toHaveLength(1)
    expect(next.projects[0].name).toBe('Billing tool')
  })
})
