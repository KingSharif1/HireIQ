import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scrapeJobUrl, LinkedInBlockedError, isOracleCloudJobUrl } from '../job-scraper'

describe('isOracleCloudJobUrl', () => {
  it('detects Emerson-style Oracle CX hosts', () => {
    expect(
      isOracleCloudJobUrl(
        'https://hdjq.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/26010937',
      ),
    ).toBe(true)
    expect(isOracleCloudJobUrl('https://boards.greenhouse.io/acme/jobs/1')).toBe(false)
  })
})

describe('scrapeJobUrl — LinkedIn', () => {
  it('throws LinkedInBlockedError without fetching', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    await expect(
      scrapeJobUrl('https://www.linkedin.com/jobs/view/1234567890')
    ).rejects.toBeInstanceOf(LinkedInBlockedError)
    expect(fetchSpy).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})

describe('scrapeJobUrl — Workday', () => {
  const workdayUrl =
    'https://acme.wd1.myworkdayjobs.com/en-US/External/job/Remote/Engineer_R12345'

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches via Workday internal API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobPostingInfo: {
          title: 'Software Engineer',
          location: 'Remote',
          jobDescription: '<p>Build APIs for our platform serving thousands of enterprise customers daily.</p>',
        },
      }),
    } as Response)

    const result = await scrapeJobUrl(workdayUrl)

    expect(fetch).toHaveBeenCalledWith(
      'https://acme.wd1.myworkdayjobs.com/wday/cxs/acme/External/job/Remote/Engineer_R12345',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    )
    expect(result.source).toBe('workday')
    expect(result.atsSystem).toBe('workday')
    expect(result.title).toBe('Software Engineer')
    expect(result.text).toContain('Build APIs')
  })
})

describe('scrapeJobUrl — Ashby', () => {
  const ashbyUrl =
    'https://jobs.ashbyhq.com/harperinsure/a5e08fb7-a266-4aaf-a9df-a58a4787e292?utm_source=ig'

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads jobs from Ashby posting-api (not legacy jobPostings)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobs: [
          {
            id: 'a5e08fb7-a266-4aaf-a9df-a58a4787e292',
            title: 'Forward Deployed Engineer',
            descriptionPlain: 'Build software at Harper.',
          },
        ],
      }),
    } as Response)

    const result = await scrapeJobUrl(ashbyUrl)

    expect(fetch).toHaveBeenCalledWith(
      'https://api.ashbyhq.com/posting-api/job-board/harperinsure',
      expect.objectContaining({ headers: { 'User-Agent': 'HireIQ/1.0' } })
    )
    expect(result.title).toBe('Forward Deployed Engineer')
    expect(result.company).toBe('harperinsure')
    expect(result.source).toBe('ashby')
    expect(result.text).toContain('Build software at Harper.')
  })
})

describe('scrapeJobUrl — Oracle thin → thicker Playwright', () => {
  const oracleUrl =
    'https://hdjq.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/26010937'

  afterEach(() => {
    vi.doUnmock('@/lib/jobs/extract-pipeline')
    vi.doUnmock('@/lib/jobs/extractors/playwright-fetch')
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('upgrades thin Oracle extract via Playwright when enabled', async () => {
    const thickText =
      'Software Engineer at Emerson. Develop embedded software for industrial hardware, integrate LiDAR and controls, ship firmware with cross-functional teams. '.repeat(
        15,
      )

    vi.doMock('@/lib/jobs/extract-pipeline', () => ({
      extractJobFromHtmlUrl: async () => ({
        result: {
          text: 'Software Engineer. Join Emerson.',
          title: 'Software Engineer',
          company: 'Emerson',
          method: 'html-heuristic',
          confidence: 'low',
        },
        attempts: [],
        pageHtml: '<html></html>',
      }),
    }))
    vi.doMock('@/lib/jobs/extractors/playwright-fetch', () => ({
      isPlaywrightFetchEnabled: () => true,
      fetchRenderedHtml: async () => `<html><body>${thickText}</body></html>`,
      extractFromRenderedHtml: () => ({
        text: thickText,
        title: 'Software Engineer',
        company: 'Emerson',
        method: 'html-heuristic',
        confidence: 'medium',
      }),
    }))

    const { scrapeJobUrl: scrape } = await import('../job-scraper')
    const result = await scrape(oracleUrl)

    expect(result.text.length).toBeGreaterThan(800)
    expect(result.extractionMethod).toBe('playwright')
    expect(result.text).toMatch(/embedded/i)
  })
})
