import { describe, expect, it } from 'vitest'
import { jobLeadsWithProjects, themeOverrideForJob } from '@/lib/tailor/job-structure'
import type { JobExtractedData } from '@/types'

const job = (over: Partial<JobExtractedData> = {}): JobExtractedData => ({
  title: 'Software Engineer',
  company: 'Acme',
  required_skills: ['TypeScript'],
  preferred_skills: [],
  required_experience_years: 3,
  education_requirement: 'BS',
  keywords: ['REST'],
  responsibilities: ['Build APIs'],
  ats_system: 'greenhouse',
  red_flags: [],
  company_values: [],
  compensation: { min: null, max: null, currency: 'USD', period: 'annual' },
  work_type: 'remote',
  seniority: 'mid',
  summary: 'Backend role',
  ...over,
})

describe('jobLeadsWithProjects', () => {
  it('is true when the posting values hobby / personal projects (Red Hawk style)', () => {
    expect(
      jobLeadsWithProjects(
        job({
          title: 'Entry-Level AI Automation Engineer',
          summary: 'Hobby and personal projects count as real experience.',
          seniority: 'intern',
        }),
      ),
    ).toBe(true)
  })

  it('is false for a standard mid-level job posting', () => {
    expect(jobLeadsWithProjects(job())).toBe(false)
  })
})

describe('themeOverrideForJob', () => {
  it('puts projects before experience when the JD leads with built work', () => {
    const override = themeOverrideForJob(
      job({ summary: 'We value passion projects and tinkering over credentials.' }),
    )
    expect(override?.sectionOrder?.[0]).toBe('summary')
    expect(override?.sectionOrder?.[1]).toBe('projects')
    expect(override?.sectionOrder?.[2]).toBe('experience')
  })

  it('leaves default section order for a typical SWE posting', () => {
    expect(themeOverrideForJob(job())).toBeNull()
  })
})
