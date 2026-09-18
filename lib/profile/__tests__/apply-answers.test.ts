import { describe, expect, it } from 'vitest'
import { emptyProfileData } from '@/lib/profile/data'
import { rememberApplyAnswer } from '@/lib/profile/apply-answers'

describe('rememberApplyAnswer', () => {
  it('maps sponsorship and work-auth into structured fields', () => {
    let data = emptyProfileData()
    data = rememberApplyAnswer(data, {
      key: 'sponsor',
      question: 'Will you now or in the future require visa sponsorship?',
      answer: 'No',
      updatedAt: '2026-08-15T00:00:00Z',
    })
    data = rememberApplyAnswer(data, {
      key: 'auth',
      question: 'Are you authorized to work in the United States?',
      answer: 'Yes',
      updatedAt: '2026-08-15T00:00:00Z',
    })
    expect(data.applyAnswers?.requiresSponsorship).toBe('no')
    expect(data.applyAnswers?.workAuthorizedUS).toBe('yes')
    expect(data.applyAnswers?.saved).toEqual([])
  })

  it('keeps job-specific questions in saved list', () => {
    const data = rememberApplyAnswer(emptyProfileData(), {
      key: 'why',
      question: 'Why do you want to work at this company?',
      answer: 'The product is interesting.',
      updatedAt: '2026-08-15T00:00:00Z',
    })
    expect(data.applyAnswers?.saved).toHaveLength(1)
    expect(data.applyAnswers?.saved[0]?.answer).toContain('product')
  })

  it('maps date of birth and bounded salary questions into reusable fields', () => {
    let data = rememberApplyAnswer(emptyProfileData(), {
      key: 'dob',
      question: 'Date of birth',
      answer: '2000-06-15',
      updatedAt: '2026-09-17T00:00:00Z',
    })
    data = rememberApplyAnswer(data, {
      key: 'salary-min',
      question: 'Minimum desired salary',
      answer: '70000',
      updatedAt: '2026-09-17T00:00:00Z',
    })
    data = rememberApplyAnswer(data, {
      key: 'salary-max',
      question: 'Maximum desired compensation',
      answer: '115000',
      updatedAt: '2026-09-17T00:00:00Z',
    })

    expect(data.applyAnswers?.dateOfBirth).toBe('2000-06-15')
    expect(data.applyAnswers?.desiredSalaryMin).toBe('70000')
    expect(data.applyAnswers?.desiredSalaryMax).toBe('115000')
  })
})
