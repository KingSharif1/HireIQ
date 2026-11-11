import { describe, it, expect } from 'vitest'
import {
  estimateApplyCredits,
  creditCostForEase,
  EASY_APPLY_CREDITS,
  HARD_APPLY_CREDITS,
} from '@/lib/apply/credit-cost'

describe('creditCostForEase', () => {
  it('charges 1 for easy, 3 for hard, 1 for unknown', () => {
    expect(creditCostForEase('easy')).toBe(EASY_APPLY_CREDITS)
    expect(creditCostForEase('hard')).toBe(HARD_APPLY_CREDITS)
    expect(creditCostForEase('unknown')).toBe(EASY_APPLY_CREDITS)
  })
})

describe('estimateApplyCredits', () => {
  it('prices public single-form ATS at 1 credit', () => {
    for (const url of [
      'https://boards.greenhouse.io/acme/jobs/1',
      'https://jobs.lever.co/acme/abc',
      'https://jobs.ashbyhq.com/acme/xyz',
      'https://apply.workable.com/acme/j/ABC/',
    ]) {
      expect(estimateApplyCredits({ url }).credits).toBe(EASY_APPLY_CREDITS)
    }
  })

  it('prices account portals and multi-step at 3 credits', () => {
    for (const url of [
      'https://acme.wd1.myworkdayjobs.com/en-US/Acme/job/1',
      'https://acme.taleo.net/careersection/1/jobdetail.ftl',
      'https://acme.icims.com/jobs/1',
      'https://acme.oraclecloud.com/hcmUI/CandidateExperience/job/1',
    ]) {
      expect(estimateApplyCredits({ url }).credits).toBe(HARD_APPLY_CREDITS)
    }
  })

  it('returns explanatory signals', () => {
    const est = estimateApplyCredits({ url: 'https://boards.greenhouse.io/acme/jobs/1' })
    expect(est.signals.length).toBeGreaterThan(0)
  })
})
