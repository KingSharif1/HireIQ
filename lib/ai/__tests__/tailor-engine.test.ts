import { describe, expect, it } from 'vitest'
import {
  buildResumeChanges,
  buildTailorWarning,
  buildWriteBackSuggestions,
  normalizeCritique,
  passesTailorGate,
  pickBestAttempt,
  seniorityLengthBudget,
  shouldRetryLoop,
} from '@/lib/ai/tailor-engine'
import { TAILOR_MAX_RETRIES, TAILOR_OVERLAP_GATE, TAILOR_MAX_AI_CALLS } from '@/lib/ai/models'
import { sampleStructuredResume } from '@/lib/profile/__tests__/fixtures'
import type { TailorCritiqueReport } from '@/lib/ai/tailor-types'

function critique(overrides: Partial<TailorCritiqueReport>): TailorCritiqueReport {
  return normalizeCritique({
    language_overlap_percent: 80,
    ats_pass: true,
    human_pass: true,
    flags: [],
    weak_sections: [],
    suggestions: [],
    ...overrides,
  })
}

describe('passesTailorGate', () => {
  it('passes at 70% overlap with no unsupported flags', () => {
    expect(passesTailorGate(critique({ language_overlap_percent: 70 }))).toBe(true)
  })

  it('fails below 70% overlap', () => {
    expect(passesTailorGate(critique({ language_overlap_percent: 69 }))).toBe(false)
  })

  it('fails on unsupported_claim even with high overlap', () => {
    expect(
      passesTailorGate(
        critique({
          language_overlap_percent: 95,
          flags: [{ type: 'unsupported_claim', section: 'experience', detail: 'invented metric' }],
        })
      )
    ).toBe(false)
  })
})

describe('shouldRetryLoop', () => {
  it('retries when gate fails and under max', () => {
    expect(shouldRetryLoop(0, critique({ language_overlap_percent: 50 }))).toBe(true)
  })

  it('stops after max retries', () => {
    expect(shouldRetryLoop(TAILOR_MAX_RETRIES, critique({ language_overlap_percent: 50 }))).toBe(false)
  })

  it('does not retry when gate passes', () => {
    expect(shouldRetryLoop(0, critique({ language_overlap_percent: 85 }))).toBe(false)
  })
})

describe('seniorityLengthBudget', () => {
  it('allows 2 pages for senior roles', () => {
    expect(seniorityLengthBudget('senior')).toContain('2 pages')
  })

  it('targets 1 page for junior/mid', () => {
    expect(seniorityLengthBudget('mid')).toContain('1 page')
  })
})

describe('buildResumeChanges', () => {
  it('detects summary and bullet changes with changeType', () => {
    const before = sampleStructuredResume()
    const after = sampleStructuredResume({
      summary: 'Tailored summary for backend role',
      experience: [
        {
          ...before.experience[0],
          bullets: ['Built REST APIs with Node.js', 'New tailored bullet'],
        },
      ],
    })

    const changes = buildResumeChanges(before, after)
    expect(changes.some(c => c.section === 'summary' && c.changeType === 'changed')).toBe(true)
    expect(changes.some(c => c.section === 'experience' && c.field === 'bullets')).toBe(true)
  })
})

describe('buildWriteBackSuggestions', () => {
  it('creates suggestions from substantive answers', () => {
    const suggestions = buildWriteBackSuggestions(
      { q1: 'Short', q2: 'Led a team of five engineers to migrate the payment service to Kubernetes.' },
      'Platform Engineer'
    )
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].sourceQuestionId).toBe('q2')
  })
})

describe('pickBestAttempt', () => {
  it('prefers fewer unsupported claims then higher overlap', () => {
    const a = {
      resume: sampleStructuredResume(),
      critique: critique({ language_overlap_percent: 90, flags: [{ type: 'unsupported_claim', section: 'x', detail: '' }] }),
    }
    const b = {
      resume: sampleStructuredResume({ summary: 'Better' }),
      critique: critique({ language_overlap_percent: 75 }),
    }
    expect(pickBestAttempt([a, b]).resume.summary).toBe('Better')
  })
})

describe('cost guard constants', () => {
  it('bounds retries and AI calls', () => {
    expect(TAILOR_MAX_RETRIES).toBe(2)
    expect(TAILOR_MAX_AI_CALLS).toBeLessThanOrEqual(10)
  })
})

describe('buildTailorWarning', () => {
  it('returns undefined when gate passes', () => {
    expect(buildTailorWarning(critique({ language_overlap_percent: TAILOR_OVERLAP_GATE }))).toBeUndefined()
  })

  it('describes failure reasons when gate fails', () => {
    const warning = buildTailorWarning(critique({ language_overlap_percent: 40 }))
    expect(warning).toContain('40%')
  })
})
