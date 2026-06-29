import { describe, it, expect } from 'vitest'
import {
  buildWorkdayApiUrl,
  detectJobUrlKind,
  isLinkedInJobUrl,
  isAggregatorJobUrl,
  parseWorkdayUrl,
} from '@/lib/jobs/url-detect'

describe('url-detect', () => {
  it('detects LinkedIn job URLs', () => {
    expect(isLinkedInJobUrl('https://www.linkedin.com/jobs/view/1234567890')).toBe(true)
    expect(isLinkedInJobUrl('https://linkedin.com/jobs/collections/recommended/')).toBe(true)
    expect(isLinkedInJobUrl('https://boards.greenhouse.io/acme/jobs/1')).toBe(false)
  })

  it('detects aggregator URLs', () => {
    expect(isAggregatorJobUrl('https://www.indeed.com/viewjob?jk=abc')).toBe(true)
    expect(isAggregatorJobUrl('https://jobs.lever.co/acme/uuid')).toBe(false)
  })

  it('parses Workday career URLs', () => {
    const url =
      'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareers/job/US-CA/Engineer_JR1985909'
    const parts = parseWorkdayUrl(url)
    expect(parts).not.toBeNull()
    expect(parts!.tenant).toBe('nvidia')
    expect(parts!.wdHost).toBe('wd5')
    expect(parts!.board).toBe('NVIDIAExternalCareers')
    expect(parts!.jobPath).toBe('US-CA/Engineer_JR1985909')
    expect(buildWorkdayApiUrl(parts!)).toBe(
      'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareers/job/US-CA/Engineer_JR1985909'
    )
  })

  it('classifies URL kinds', () => {
    expect(detectJobUrlKind('https://www.linkedin.com/jobs/view/1')).toBe('linkedin')
    expect(detectJobUrlKind('https://acme.wd1.myworkdayjobs.com/en-US/External/job/City/Role_R1')).toBe('workday')
    expect(detectJobUrlKind('https://boards.greenhouse.io/acme/jobs/1')).toBe('greenhouse')
    expect(detectJobUrlKind('https://www.indeed.com/viewjob?jk=x')).toBe('aggregator')
  })
})
