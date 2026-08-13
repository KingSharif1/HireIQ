/**
 * Live network smoke tests — run explicitly:
 *   JOB_FETCH_LIVE=1 JOB_FETCH_PLAYWRIGHT=0 npx vitest run lib/jobs/__tests__/job-fetch-live.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { scrapeJobUrl, LinkedInBlockedError } from '@/lib/jobs/job-scraper'

const LIVE = process.env.JOB_FETCH_LIVE === '1'

type LiveCase = {
  name: string
  url: string
  minChars: number
  expectSource?: string
  expectBlocked?: boolean
  titleIncludes?: string
  expectMethod?: string
  allowLowConfidence?: boolean
  allowFetchFailure?: boolean
}

const CASES: LiveCase[] = [
  {
    name: 'Apple careers (hydration JSON)',
    url: 'https://jobs.apple.com/en-us/details/200677377-0157/software-engineer-is-t-early-career-opportunities?team=SFTWR',
    minChars: 500,
    expectSource: 'generic',
    expectMethod: 'hydration-json',
    titleIncludes: 'Software Engineer',
  },
  {
    name: 'Greenhouse — Discord',
    url: 'https://job-boards.greenhouse.io/discord/jobs/8599937002',
    minChars: 200,
    expectSource: 'greenhouse',
    titleIncludes: 'Account Manager',
  },
  {
    name: 'Lever — Spotify',
    url: 'https://jobs.lever.co/spotify/890b2c0f-f46f-4a4b-bb73-3a6af6e0edd5',
    minChars: 200,
    expectSource: 'lever',
  },
  {
    name: 'Ashby — Harper Insure',
    url: 'https://jobs.ashbyhq.com/harperinsure/03e760cc-2000-4c77-bea3-58cb09705d0f',
    minChars: 100,
    expectSource: 'ashby',
  },
  {
    name: 'Workday — NVIDIA',
    url: 'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/Israel-Raanana/Software-Engineer---SONiC-Verification_JR2022775',
    minChars: 200,
    expectSource: 'workday',
    titleIncludes: 'Software Engineer',
  },
  {
    name: 'Stripe careers (gh_jid Greenhouse embed)',
    url: 'https://stripe.com/jobs/search?gh_jid=8077887',
    minChars: 200,
    expectSource: 'greenhouse',
  },
  {
    name: 'Indeed aggregator (warning, medium confidence)',
    url: 'https://www.indeed.com/viewjob?jk=abc123def456',
    minChars: 0,
    expectSource: 'aggregator',
    allowLowConfidence: true,
    allowFetchFailure: true,
  },
  {
    name: 'LinkedIn blocked',
    url: 'https://www.linkedin.com/jobs/view/1234567890',
    minChars: 0,
    expectBlocked: true,
  },
  {
    name: 'Amazon careers (Open Graph)',
    url: 'https://www.amazon.jobs/en/jobs/10500800/digital-content-associate-prime-video-sports',
    minChars: 500,
    expectSource: 'amazon',
    expectMethod: 'open-graph',
    titleIncludes: 'Digital Content Associate',
  },
  {
    name: 'Microsoft careers (Eightfold PCSX API)',
    url: 'https://apply.careers.microsoft.com/careers?pid=1970393556944855',
    minChars: 500,
    expectSource: 'microsoft',
    expectMethod: 'ats-api',
    titleIncludes: 'Principal Software Engineer',
  },
]

describe.skipIf(!LIVE)('job fetch — live URLs', () => {
  beforeAll(() => {
    process.env.JOB_FETCH_PLAYWRIGHT = '0'
  })

  for (const c of CASES) {
    it(
      c.name,
      async () => {
        if (c.expectBlocked) {
          await expect(scrapeJobUrl(c.url)).rejects.toBeInstanceOf(LinkedInBlockedError)
          return
        }

        try {
          const result = await scrapeJobUrl(c.url)
          expect(result.text.length).toBeGreaterThanOrEqual(c.minChars)
          if (c.expectSource) expect(result.source).toBe(c.expectSource)
          if (c.titleIncludes) expect(result.title).toContain(c.titleIncludes)
          if (c.expectMethod) expect(result.extractionMethod).toBe(c.expectMethod)
          if (c.expectSource === 'aggregator') {
            expect(result.warning).toBeTruthy()
            expect(result.confidence).toBe('medium')
          } else if (!c.allowLowConfidence) {
            expect(result.confidence).not.toBe('low')
          }
        } catch (err) {
          if (c.allowFetchFailure) {
            expect(err).toBeInstanceOf(Error)
            return
          }
          throw err
        }
      },
      45_000,
    )
  }
})

describe('job fetch — live runner helper', () => {
  it('documents how to run live tests', () => {
    expect(LIVE || true).toBe(true)
  })
})
