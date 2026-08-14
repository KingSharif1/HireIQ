import { describe, expect, it, vi } from 'vitest'
import { runTailorPipeline } from '@/lib/ai/tailor-pipeline'
import { sampleStructuredResume } from '@/lib/profile/__tests__/fixtures'
import type { JobExtractedData } from '@/types'

const job: JobExtractedData = {
  title: 'Software Engineer',
  company: 'Acme',
  required_skills: ['TypeScript', 'Node.js'],
  preferred_skills: [],
  required_experience_years: 3,
  education_requirement: 'BS',
  keywords: ['REST API', 'microservices'],
  responsibilities: ['Build scalable APIs'],
  ats_system: 'greenhouse',
  red_flags: [],
  company_values: [],
  compensation: { min: null, max: null, currency: 'USD', period: 'annual' },
  work_type: 'remote',
  seniority: 'mid',
  summary: 'Backend engineer role',
}

const passCritique = JSON.stringify({
  language_overlap_percent: 85,
  ats_pass: true,
  human_pass: true,
  flags: [],
  weak_sections: [],
  suggestions: [],
})

const failCritique = JSON.stringify({
  language_overlap_percent: 55,
  ats_pass: false,
  human_pass: false,
  flags: [{ type: 'vague', section: 'summary', detail: 'too generic' }],
  weak_sections: ['summary'],
  suggestions: ['Add job keywords to summary'],
})

const tailoredResume = sampleStructuredResume({ summary: 'Tailored for Acme backend APIs' })

describe('runTailorPipeline', () => {
  it('skips retry loop when first draft passes gate', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(tailoredResume))
      .mockResolvedValueOnce(passCritique)
      .mockResolvedValueOnce(passCritique)

    const result = await runTailorPipeline({
      resume: sampleStructuredResume(),
      job,
      answers: {},
      generate,
    })

    expect(result.meta.passedGate).toBe(true)
    expect(result.meta.attempts).toBe(1)
    expect(generate).toHaveBeenCalledTimes(3)
    expect(result.tailoredResume.summary).toContain('Tailored')
  })

  it('retries weak sections up to max then returns best attempt', async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(tailoredResume))
      .mockResolvedValueOnce(failCritique)
      .mockResolvedValueOnce(JSON.stringify({ ...tailoredResume, summary: 'Improved draft' }))
      .mockResolvedValueOnce(failCritique)
      .mockResolvedValueOnce(JSON.stringify({ ...tailoredResume, summary: 'Improved draft v2' }))
      .mockResolvedValueOnce(failCritique)
      .mockResolvedValueOnce(failCritique)

    const result = await runTailorPipeline({
      resume: sampleStructuredResume(),
      job,
      answers: {},
      generate,
    })

    expect(result.meta.attempts).toBeGreaterThan(1)
    expect(result.meta.warning).toBeTruthy()
    expect(result.changes.length).toBeGreaterThan(0)
  })

  it('survives incomplete Claude JSON in fastMode (missing bullets/projects)', async () => {
    const incomplete = {
      contact: { name: 'Jane' },
      summary: 'Tailored for Acme',
      experience: [{ id: 'exp-1', title: 'SE', company: 'Acme' }],
      skills: { technical: ['TypeScript'] },
    }
    const generate = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(incomplete))
      .mockResolvedValueOnce(passCritique)

    const result = await runTailorPipeline({
      resume: sampleStructuredResume(),
      job,
      answers: {},
      generate,
      fastMode: true,
    })

    expect(result.tailoredResume.summary).toContain('Tailored')
    expect(result.tailoredResume.experience[0].bullets).toEqual([])
    expect(result.tailoredResume.projects).toEqual([])
    expect(generate).toHaveBeenCalledTimes(2)
  })
})
