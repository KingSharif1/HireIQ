import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scrapeJobUrl, LinkedInBlockedError } from '../job-scraper'

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
