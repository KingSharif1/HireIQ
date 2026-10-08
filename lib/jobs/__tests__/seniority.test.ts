import { describe, expect, it } from 'vitest'
import { resolveSeniority } from '@/lib/jobs/seniority'
import { normalizeJobExtractedData } from '@/lib/jobs/normalize-job'

describe('resolveSeniority', () => {
  it('does not label a new-grad role as intern', () => {
    expect(
      resolveSeniority({
        seniority: 'intern',
        title: 'Software Engineer (New Grad December 2026)',
        summary: 'Full-time university hire.',
      }),
    ).toBe('new_grad')
  })

  it('keeps a real internship as intern', () => {
    expect(
      resolveSeniority({
        seniority: 'new_grad',
        title: 'Software Engineering Intern',
        description: 'This internship runs for 12 weeks. New graduates may apply later.',
      }),
    ).toBe('intern')
  })

  it('corrects intern when only the posting body says new graduate', () => {
    expect(
      resolveSeniority({
        seniority: 'intern',
        title: 'Software Engineer',
        description: 'We are hiring a new graduate for a full-time role.',
      }),
    ).toBe('new_grad')
  })

  it('leaves a senior label alone', () => {
    expect(
      resolveSeniority({
        seniority: 'senior',
        title: 'Senior Software Engineer',
        summary: 'Lead the platform.',
      }),
    ).toBe('senior')
  })
})

describe('normalizeJobExtractedData seniority', () => {
  it('stores new_grad when the description is a new-grad posting', () => {
    const job = normalizeJobExtractedData(
      {
        title: 'Software Engineer',
        seniority: 'intern',
        summary: 'Build product.',
      },
      { description: 'Early career, new graduate, full-time.', title: 'Software Engineer' },
    )
    expect(job.seniority).toBe('new_grad')
  })
})
