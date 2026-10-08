import { describe, expect, it, vi } from 'vitest'
import { runTailorPipeline } from '@/lib/ai/tailor-pipeline'
import { structuredResumeToMarkdown } from '@/lib/resume/markdown'
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

const base = sampleStructuredResume({ summary: 'Engineer who ships.' })
const tailoredMd = structuredResumeToMarkdown(
  sampleStructuredResume({ summary: 'Tailored for Acme backend APIs' }),
)

describe('runTailorPipeline', () => {
  it('sends markdown resume to the model and parses markdown back', async () => {
    const generate = vi.fn().mockResolvedValueOnce(tailoredMd)

    const result = await runTailorPipeline({
      resume: base,
      job,
      answers: {},
      generate,
    })

    expect(result.meta.aiCallsUsed).toBe(1)
    expect(generate).toHaveBeenCalledTimes(1)
    const prompt = generate.mock.calls[0][0].prompt as string
    expect(prompt).toContain('HireIQ markdown')
    expect(prompt).toContain('## Summary')
    expect(prompt).not.toContain('{structuredResume}')
    expect(result.tailoredResume.summary).toContain('Tailored')
  })

  it('retries once when the first rewrite markdown is empty/broken', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce('sorry I cannot help')
      .mockResolvedValueOnce(tailoredMd)

    const result = await runTailorPipeline({
      resume: base,
      job,
      answers: {},
      generate,
    })

    expect(generate).toHaveBeenCalledTimes(2)
    expect(result.meta.aiCallsUsed).toBe(2)
    expect(result.tailoredResume.summary).toContain('Tailored')
    expect(generate.mock.calls[1][0].prompt).toContain('CRITICAL RETRY')
  })

  it('retries once when the model returns broken JSON instead of markdown', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce('{"experience":[ { "title": "Eng" {')
      .mockResolvedValueOnce(tailoredMd)

    const result = await runTailorPipeline({
      resume: base,
      job,
      answers: {},
      generate,
    })

    expect(generate).toHaveBeenCalledTimes(2)
    expect(result.meta.aiCallsUsed).toBe(2)
    expect(result.tailoredResume.summary).toContain('Tailored')
    expect(generate.mock.calls[1][0].prompt).toContain('CRITICAL RETRY')
    expect(generate.mock.calls[1][0].prompt).toContain('No JSON')
  })

  it('strips literal markdown from bullets before the draft is saved', async () => {
    const messy = tailoredMd.replace(
      'Built APIs with Node.js',
      '**Built APIs** with Node.js and **unclosed',
    )
    const generate = vi.fn().mockResolvedValueOnce(messy)
    const result = await runTailorPipeline({
      resume: base,
      job,
      answers: {},
      generate,
    })
    const bullet = result.tailoredResume.experience[0]?.bullets[0] ?? ''
    expect(bullet).not.toContain('**')
    expect(bullet).toContain('Built APIs')
  })

  it('does not call Claude again when the draft is fine', async () => {
    const generate = vi.fn().mockResolvedValueOnce(tailoredMd)
    await runTailorPipeline({
      resume: base,
      job,
      answers: {},
      generate,
    })
    expect(generate).toHaveBeenCalledTimes(1)
  })
})
