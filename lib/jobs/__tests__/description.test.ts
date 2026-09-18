import { describe, expect, it } from 'vitest'
import {
  buildJobDescriptionView,
  normalizeJobDescription,
  stripAtsChrome,
} from '@/lib/jobs/description'
import { normalizeApplyUrl } from '@/lib/extension/normalize-url'
import type { JobExtractedData } from '@/types'

const extracted: JobExtractedData = {
  title: 'Engineer',
  company: 'Acme',
  required_skills: ['TypeScript', 'TypeScript'],
  preferred_skills: ['React'],
  required_experience_years: 2,
  education_requirement: '',
  keywords: ['Automation', 'automation'],
  responsibilities: [
    ' Build practical internal tools for operators ',
    'Build practical internal tools for operators',
    '• Partner with users to ship durable workflows',
  ],
  ats_system: '',
  red_flags: [],
  company_values: [],
  compensation: { min: null, max: null, currency: 'USD', period: 'year' },
  work_type: 'onsite',
  seniority: 'mid',
  summary: ' Build practical internal tools. ',
}

const AECHELON_CHROME_BLOB =
  "Back to jobsRTK - Junior Software Engineer - InternshipFarmer's Branch, TexasApplyAechelon Technology develops advanced visualization and simulation systems for aerospace customers. We build real-time image generation and mission systems used in training."

describe('job description view', () => {
  it('compacts whitespace and preserves paragraphs', () => {
    expect(normalizeJobDescription(' First   line \n\n\n • Second line ')).toBe(
      'First line\n\nSecond line'
    )
  })

  it('deduplicates extracted sections', () => {
    const view = buildJobDescriptionView('Full posting', extracted)
    expect(view.summary).toBe('Build practical internal tools.')
    expect(view.responsibilities).toEqual([
      'Build practical internal tools for operators',
      'Partner with users to ship durable workflows',
    ])
    expect(view.requirements).toEqual([
      '2+ years of relevant experience',
      'Required: TypeScript',
      'Preferred: React',
    ])
    expect(view.keywords).toEqual(['Automation'])
  })

  it('caps extracted sections to keep the formatted view concise', () => {
    const values = Array.from(
      { length: 20 },
      (_, index) => `Own end-to-end delivery for workflow item ${index + 1}`
    )
    const view = buildJobDescriptionView('Full posting', {
      ...extracted,
      required_skills: values,
      preferred_skills: [],
      responsibilities: values,
      keywords: values,
    })

    expect(view.responsibilities).toHaveLength(8)
    expect(view.requirements).toHaveLength(10)
    expect(view.keywords).toHaveLength(16)
  })

  it('falls back safely when extracted data is missing', () => {
    expect(buildJobDescriptionView('', null)).toEqual({
      summary: '',
      responsibilities: [],
      requirements: [],
      keywords: [],
      fullText: '',
    })
  })

  it('strips Aechelon-like Greenhouse chrome and yields a readable summary', () => {
    const stripped = stripAtsChrome(AECHELON_CHROME_BLOB)
    expect(stripped).not.toMatch(/Back to jobs/i)
    expect(stripped).not.toMatch(/TexasApplyAechelon/)
    expect(stripped).toMatch(/Texas/)
    expect(stripped).toMatch(/Aechelon Technology/)

    const normalized = normalizeJobDescription(AECHELON_CHROME_BLOB)
    expect(normalized).not.toMatch(/Back to jobs/i)
    expect(normalized).not.toMatch(/\bApply\b/)

    const view = buildJobDescriptionView(AECHELON_CHROME_BLOB, null)
    expect(view.summary.length).toBeGreaterThan(20)
    expect(view.summary.length).toBeLessThanOrEqual(360)
    expect(view.summary).not.toMatch(/Back to jobs/i)
    expect(view.summary).not.toMatch(/TexasApply/)
    expect(view.summary).toMatch(/Aechelon Technology/)
    expect(view.summary).not.toMatch(/InternshipFarmer/)
    expect(view.requirements).toEqual([])
    expect(view.keywords).toEqual([])
    expect(view.fullText.includes('\n\n') || view.fullText.includes('Aechelon')).toBe(true)
    // Chrome blobs must not become a giant responsibility bullet;
    // title/location leftovers after un-glue are also rejected.
    expect(
      view.responsibilities.every(
        item =>
          item.length <= 280 &&
          !/Back\s*to\s*jobs/i.test(item) &&
          !/TexasApply/i.test(item) &&
          !/Farmer's Branch/i.test(item) &&
          !/^RTK\b/i.test(item)
      )
    ).toBe(true)
    expect(view.responsibilities.some(item => /real-time image generation/i.test(item))).toBe(
      true
    )
  })

  it('ignores polluted extracted.summary chrome blobs', () => {
    const view = buildJobDescriptionView(AECHELON_CHROME_BLOB, {
      ...extracted,
      summary: AECHELON_CHROME_BLOB,
      responsibilities: [],
      required_skills: [],
      preferred_skills: [],
      keywords: [],
      required_experience_years: 0,
      education_requirement: '',
    })
    expect(view.summary).not.toMatch(/Back to jobs/i)
    expect(view.summary).toMatch(/Aechelon|visualization|simulation/i)
  })

  it('uses normalizeApplyUrl for idempotent Greenhouse identity', () => {
    const a =
      'https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008?utm_source=linkedin#apply'
    const b = 'https://job-boards.greenhouse.io/aechelontechnology/jobs/4904960008'
    expect(normalizeApplyUrl(a)).toBe(normalizeApplyUrl(b))
  })

  it('truncates Greenhouse apply-form chrome from full posting text', () => {
    const polluted =
      "Aechelon Technology builds simulators.\n\n" +
      "with MyGreenhouseFirst Name*Last Name*Preferred First NameEmail*PhoneCountryPhone " +
      "244 results foundNo results foundAfghanistan+93Åland Islands+358Albania+355Algeria+213"

    const view = buildJobDescriptionView(polluted, null)
    expect(view.fullText).toMatch(/Aechelon Technology builds simulators/)
    expect(view.fullText).not.toMatch(/MyGreenhouse/i)
    expect(view.fullText).not.toMatch(/First Name/i)
    expect(view.fullText).not.toMatch(/Afghanistan/i)
    expect(view.fullText).not.toMatch(/results found/i)
    expect(view.summary).not.toMatch(/Afghanistan|MyGreenhouse/i)
  })
})
