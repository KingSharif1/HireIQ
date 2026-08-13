import { describe, expect, it } from 'vitest'
import { boardFromApplyUrl, estimateApplyComplexity } from '@/lib/apply/types'

describe('estimateApplyComplexity', () => {
  it('marks Workday as complexity 3', () => {
    expect(
      estimateApplyComplexity(
        'https://company.wd5.myworkdayjobs.com/en-US/Careers/job/Foo/Bar_JR123'
      )
    ).toBe(3)
  })

  it('marks Greenhouse / Lever / Ashby as complexity 1', () => {
    expect(
      estimateApplyComplexity('https://boards.greenhouse.io/acme/jobs/123')
    ).toBe(1)
    expect(estimateApplyComplexity('https://jobs.lever.co/acme/abc')).toBe(1)
    expect(
      estimateApplyComplexity('https://jobs.ashbyhq.com/acme/uuid-here')
    ).toBe(1)
  })

  it('defaults invalid URLs to 1', () => {
    expect(estimateApplyComplexity('not-a-url')).toBe(1)
  })
})

describe('boardFromApplyUrl', () => {
  it('detects common boards', () => {
    expect(boardFromApplyUrl('https://job-boards.greenhouse.io/x/jobs/1')).toBe(
      'greenhouse'
    )
    expect(boardFromApplyUrl('https://jobs.lever.co/x/y')).toBe('lever')
    expect(boardFromApplyUrl('https://jobs.ashbyhq.com/x/y')).toBe('ashby')
    expect(
      boardFromApplyUrl('https://acme.wd1.myworkdayjobs.com/en-US/Careers')
    ).toBe('workday')
  })

  it('falls back to generic', () => {
    expect(boardFromApplyUrl('https://careers.example.com/jobs/1')).toBe(
      'generic'
    )
  })
})
