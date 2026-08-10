import { describe, expect, it } from 'vitest'
import { isLastingCareerFact } from '@/lib/extension/draft-kind'

describe('isLastingCareerFact', () => {
  it('returns true for lasting career facts', () => {
    expect(isLastingCareerFact('What skills do you have?')).toBe(true)
    expect(isLastingCareerFact('Years of experience')).toBe(true)
    expect(isLastingCareerFact('Tools / technologies')).toBe(true)
    expect(isLastingCareerFact('Languages spoken')).toBe(true)
    expect(isLastingCareerFact('Highest education')).toBe(true)
    expect(isLastingCareerFact('Degree')).toBe(true)
    expect(isLastingCareerFact('Are you authorized to work in the US?')).toBe(true)
    expect(isLastingCareerFact('Work authorization status')).toBe(true)
  })

  it('returns false for job-specific essays and availability', () => {
    expect(isLastingCareerFact('Why this company?')).toBe(false)
    expect(isLastingCareerFact('Why are you interested in this role?')).toBe(false)
    expect(isLastingCareerFact('Cover letter')).toBe(false)
    expect(isLastingCareerFact('Availability to start')).toBe(false)
    expect(isLastingCareerFact('Start date')).toBe(false)
    expect(isLastingCareerFact('When can you start?')).toBe(false)
  })

  it('returns false for empty / unrelated labels', () => {
    expect(isLastingCareerFact('')).toBe(false)
    expect(isLastingCareerFact('How did you hear about us?')).toBe(false)
  })
})
