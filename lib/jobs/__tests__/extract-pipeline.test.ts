import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { extractFromHydration } from '@/lib/jobs/extractors/hydration'
import { extractFromJsonLd } from '@/lib/jobs/extractors/json-ld'
import { extractFromOpenGraph } from '@/lib/jobs/extractors/open-graph'
import { extractJobFromHtmlUrl } from '@/lib/jobs/extract-pipeline'

const FIXTURE_DIR = join(__dirname, 'fixtures')

describe('extractFromHydration — Apple careers', () => {
  it('extracts full posting from __staticRouterHydrationData', () => {
    const html = readFileSync(join(FIXTURE_DIR, 'apple-job.html'), 'utf8')
    const url =
      'https://jobs.apple.com/en-us/details/200677377-0157/software-engineer-is-t-early-career-opportunities?team=SFTWR'

    const result = extractFromHydration(html, url)

    expect(result).not.toBeNull()
    expect(result!.ruleId).toBe('apple-jobs-hydration')
    expect(result!.title).toContain('Software Engineer')
    expect(result!.company).toBe('Apple')
    expect(result!.text).toContain('Information Systems and Technology')
    expect(result!.text).toContain('Minimum Qualifications')
    expect(result!.text).toContain('Python')
    expect(result!.text.length).toBeGreaterThan(500)
  })
})

describe('extractFromJsonLd', () => {
  it('reads schema.org JobPosting', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "Backend Engineer",
            "description": "<p>Build reliable APIs and services for our platform.</p>",
            "hiringOrganization": { "@type": "Organization", "name": "Acme Corp" }
          }
        </script>
      </head><body></body></html>
    `
    const result = extractFromJsonLd(html)
    expect(result?.title).toBe('Backend Engineer')
    expect(result?.company).toBe('Acme Corp')
    expect(result?.text).toContain('Build reliable APIs')
  })
})

describe('extractFromOpenGraph', () => {
  it('reads substantive og:description and title', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Digital Content Associate, Prime Video Sports" />
        <meta property="og:description" content="${'Are you interested in shaping the future of live sports broadcasting? '.repeat(8)}" />
        <meta property="og:site_name" content="Amazon.jobs" />
      </head><body></body></html>
    `
    const result = extractFromOpenGraph(html)
    expect(result?.method).toBe('open-graph')
    expect(result?.title).toContain('Digital Content Associate')
    expect(result?.company).toBe('Amazon.jobs')
    expect(result?.text.length).toBeGreaterThan(200)
  })

  it('ignores generic Microsoft og descriptions', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Careers at Microsoft" />
        <meta property="og:description" content="See all open jobs at Microsoft" />
      </head><body></body></html>
    `
    expect(extractFromOpenGraph(html)).toBeNull()
  })
})

describe('extractJobFromHtmlUrl — Apple fixture', () => {
  it('returns high-confidence hydration result without Playwright', async () => {
    const html = readFileSync(join(FIXTURE_DIR, 'apple-job.html'), 'utf8')
    const url =
      'https://jobs.apple.com/en-us/details/200677377-0157/software-engineer-is-t-early-career-opportunities?team=SFTWR'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => html,
      } as Response),
    )

    const { result, attempts } = await extractJobFromHtmlUrl(url)

    expect(result?.method).toBe('hydration-json')
    expect(result?.confidence).toBe('high')
    expect(attempts.some(a => a.method === 'playwright')).toBe(false)
    expect(result!.text.length).toBeGreaterThan(500)

    vi.unstubAllGlobals()
  })
})
