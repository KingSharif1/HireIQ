import { describe, expect, it } from 'vitest'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { sampleStructuredResume } from '@/lib/profile/__tests__/fixtures'

describe('calculateATSScore', () => {
  it('never returns NaN for partial job data and year-only dates', () => {
    const resume = sampleStructuredResume()
    resume.experience[0].startDate = '2020'
    resume.experience[0].endDate = '2024'

    const score = calculateATSScore(resume, {
      title: 'Engineer',
      company: 'Acme',
    })

    expect(Number.isFinite(score.total)).toBe(true)
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(100)
    for (const val of Object.values(score.breakdown)) {
      expect(Number.isFinite(val)).toBe(true)
    }
  })
})
