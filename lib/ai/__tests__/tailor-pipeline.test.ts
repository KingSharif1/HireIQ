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

const tailoredResume = sampleStructuredResume({ summary: 'Tailored for Acme backend APIs' })

describe('runTailorPipeline', () => {
  it('makes exactly one Claude call — never retries or critiques', async () => {
    const generate = vi.fn().mockResolvedValueOnce(JSON.stringify(tailoredResume))

    const result = await runTailorPipeline({
      resume: sampleStructuredResume(),
      job,
      answers: {},
      generate,
    })

    expect(result.meta.aiCallsUsed).toBe(1)
    expect(result.meta.attempts).toBe(1)
    expect(generate).toHaveBeenCalledTimes(1)
    expect(result.tailoredResume.summary).toContain('Tailored')
    const prompt = generate.mock.calls[0][0].prompt as string
    expect(prompt).toContain('ATS GAPS TO CLOSE')
    expect(prompt).toContain('human recruiter')
  })

  it('does not call Claude again when the draft is weak', async () => {
    const generate = vi.fn().mockResolvedValueOnce(JSON.stringify(tailoredResume))
    await runTailorPipeline({
      resume: sampleStructuredResume(),
      job,
      answers: {},
      generate,
    })
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('survives incomplete Claude JSON (missing bullets/projects)', async () => {
    const incomplete = {
      contact: { name: 'Jane' },
      summary: 'Tailored for Acme',
      experience: [{ id: 'exp-1', title: 'SE', company: 'Acme' }],
      skills: { technical: ['TypeScript'] },
    }
    const generate = vi.fn().mockResolvedValueOnce(JSON.stringify(incomplete))

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
    expect(generate).toHaveBeenCalledTimes(1)
  })
})
