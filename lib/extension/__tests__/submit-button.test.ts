import { describe, expect, it } from 'vitest'
import {
  isSubmitAutomationBlocked,
  pickBestSubmitLabel,
  scoreSubmitLabel,
} from '@/lib/extension/submit-button'

describe('scoreSubmitLabel', () => {
  it('prefers Submit Application over Continue', () => {
    expect(scoreSubmitLabel('Submit Application')).toBeGreaterThan(scoreSubmitLabel('Continue'))
    expect(scoreSubmitLabel('Submit')).toBeGreaterThan(scoreSubmitLabel('Next'))
  })

  it('rejects cancel/upload', () => {
    expect(scoreSubmitLabel('Cancel')).toBe(0)
    expect(scoreSubmitLabel('Upload resume')).toBe(0)
  })
})

describe('pickBestSubmitLabel', () => {
  it('picks the strongest apply CTA', () => {
    const hit = pickBestSubmitLabel(['Cancel', 'Continue', 'Submit Application', 'Back'])
    expect(hit?.label).toBe('Submit Application')
  })
})

describe('isSubmitAutomationBlocked', () => {
  it('blocks LinkedIn and Indeed', () => {
    expect(isSubmitAutomationBlocked('https://www.linkedin.com/jobs/view/123')).toBe(true)
    expect(isSubmitAutomationBlocked('https://www.indeed.com/viewjob?jk=abc')).toBe(true)
  })

  it('allows Greenhouse', () => {
    expect(
      isSubmitAutomationBlocked(
        'https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008',
      ),
    ).toBe(false)
  })
})
