import { describe, it, expect } from 'vitest'
import {
  buildWorkdayApiUrl,
  detectJobUrlKind,
  isLinkedInJobUrl,
  isAggregatorJobUrl,
  parseAmazonJobsUrl,
  parseMicrosoftCareersUrl,
  parseWorkdayUrl,
  parseGreenhouseUrl,
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
    expect(detectJobUrlKind('https://stripe.com/jobs/search?gh_jid=8077887')).toBe('greenhouse')
    expect(detectJobUrlKind('https://www.indeed.com/viewjob?jk=x')).toBe('aggregator')
    expect(
      detectJobUrlKind(
        'https://www.amazon.jobs/en/jobs/10500800/digital-content-associate-prime-video-sports'
      )
    ).toBe('amazon')
    expect(
      detectJobUrlKind('https://apply.careers.microsoft.com/careers?pid=1970393556944855')
    ).toBe('microsoft')
  })

  it('parses Amazon and Microsoft careers URLs', () => {
    expect(
      parseAmazonJobsUrl(
        'https://www.amazon.jobs/en/jobs/10500800/digital-content-associate-prime-video-sports'
      )
    ).toEqual({ jobId: '10500800' })

    expect(parseMicrosoftCareersUrl('https://apply.careers.microsoft.com/careers?pid=1970393556944855')).toEqual({
      positionId: '1970393556944855',
    })
    expect(
      parseMicrosoftCareersUrl(
        'https://jobs.careers.microsoft.com/global/en/job/1707455/Software-Engineer-II'
      )
    ).toEqual({ legacyJobId: '1707455' })
  })

  it('parses Greenhouse embed URLs with gh_jid', () => {
    expect(parseGreenhouseUrl('https://stripe.com/jobs/search?gh_jid=8077887')).toEqual({
      boardToken: 'stripe',
      jobId: '8077887',
    })
  })
})
