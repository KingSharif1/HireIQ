import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scrapeJobUrl } from '../job-scraper'

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
