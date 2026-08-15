import { describe, expect, it } from 'vitest'
import {
  describeResumeChange,
  highlightsFromChanges,
  isNewAddition,
  reasonForChange,
} from '@/lib/tailor/change-copy'
import type { ResumeDiffChange } from '@/types'

describe('reasonForChange', () => {
  it('uses a concrete Claude note over a generic fallback', () => {
    const reason = reasonForChange(
      [
        {
          section: 'experience',
          change: 'Built REST APIs in Node',
          reason: 'Rewrote the Acme API bullet to name REST because the JD asked for it.',
        },
      ],
      'experience',
      ['Built REST APIs in Node'],
      'Acme',
    )
    expect(reason).toContain('Acme API bullet')
  })

  it('does not keep empty “improved wording” notes', () => {
    const reason = reasonForChange(
      [{ section: 'summary', change: 'x', reason: 'improved wording' }],
      'summary',
      'New summary for Apple IS&T',
    )
    expect(reason.toLowerCase()).not.toContain('improved wording')
    expect(reason.toLowerCase()).toContain('recruiter')
  })
})

describe('describeResumeChange', () => {
  it('prefers the stored reason', () => {
    const change: ResumeDiffChange = {
      section: 'summary',
      field: 'text',
      before: 'Old',
      after: 'New',
      reason: 'Named the IS&T stack in the summary.',
    }
    expect(describeResumeChange(change)).toContain('IS&T')
  })
})

describe('highlightsFromChanges', () => {
  it('marks changed bullets and the parent experience', () => {
    const marks = highlightsFromChanges([
      {
        id: 'c1',
        section: 'experience',
        field: 'bullets',
        expId: 'exp-1',
        before: ['Old bullet'],
        after: ['Old bullet', 'New tailored bullet'],
        reason: 'Added a true REST bullet',
      },
    ])
    expect(marks.experienceIds.has('exp-1')).toBe(true)
    expect(marks.bullets.has('New tailored bullet')).toBe(true)
    expect(marks.bullets.has('Old bullet')).toBe(false)
  })
})

describe('isNewAddition', () => {
  it('treats added bullets as new; pure rewrites as not', () => {
    expect(
      isNewAddition({
        section: 'summary',
        field: 'text',
        before: 'Old',
        after: 'New for Apple',
        changeType: 'changed',
      })
    ).toBe(false)
    expect(
      isNewAddition({
        section: 'experience',
        field: 'bullets',
        before: ['A'],
        after: ['A', 'Brand new bullet'],
        changeType: 'changed',
      })
    ).toBe(true)
    expect(
      isNewAddition({
        section: 'experience',
        field: 'entry',
        before: '',
        after: 'SE @ Acme',
        changeType: 'added',
      })
    ).toBe(true)
  })
})
