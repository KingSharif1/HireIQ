import { describe, expect, it } from 'vitest'
import { runResumeLayoutCheck } from '@/lib/resume/layout-check'
import type { StructuredResume } from '@/types'

function baseResume(overrides: Partial<StructuredResume> = {}): StructuredResume {
  return {
    contact: {
      name: 'Alex Rivera',
      email: 'alex@example.com',
      phone: '',
      location: 'NYC',
      linkedin: '',
      github: '',
      portfolio: '',
      website: '',
    },
    summary: 'Backend engineer with 5 years building APIs.',
    experience: [
      {
        id: 'e1',
        company: 'Acme',
        title: 'Engineer',
        location: '',
        startDate: '2022',
        endDate: '',
        current: true,
        bullets: ['Built services at scale'],
        skills_used: [],
      },
    ],
    education: [],
    skills: { technical: ['TypeScript'], soft: [], tools: [], languages: [] },
    projects: [],
    certifications: [],
    volunteer: [],
    awards: [],
    ...overrides,
  }
}

describe('runResumeLayoutCheck', () => {
  it('passes a minimal valid resume', () => {
    const result = runResumeLayoutCheck(baseResume())
    expect(result.ok).toBe(true)
    expect(result.issues.some(i => i.severity === 'critical')).toBe(false)
  })

  it('flags missing name and experience', () => {
    const result = runResumeLayoutCheck(
      baseResume({
        contact: { ...baseResume().contact, name: '' },
        experience: [],
        projects: [],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.issues.map(i => i.id)).toContain('missing-name')
    expect(result.issues.map(i => i.id)).toContain('no-experience')
  })

  it('warns on placeholder text', () => {
    const result = runResumeLayoutCheck(
      baseResume({
        experience: [
          {
            ...baseResume().experience[0]!,
            bullets: ['TODO: fill this in'],
          },
        ],
      }),
    )
    expect(result.issues.some(i => i.id.startsWith('placeholder-exp'))).toBe(true)
  })

  it('warns when preview is more than one page', () => {
    const result = runResumeLayoutCheck(baseResume(), { pageCount: 2 })
    expect(result.ok).toBe(true)
    expect(result.issues.map(i => i.id)).toContain('multi-page')
  })

  it('warns when body font is too large or too small', () => {
    const large = runResumeLayoutCheck(baseResume(), { fonts: { bodyFontSize: 16 } })
    expect(large.ok).toBe(true)
    expect(large.issues.map(i => i.id)).toContain('body-font-size')

    const tiny = runResumeLayoutCheck(baseResume(), { fonts: { bodyFontSize: 8 } })
    expect(tiny.issues.map(i => i.id)).toContain('body-font-size')
  })

  it('warns when name size or line height is extreme', () => {
    const result = runResumeLayoutCheck(baseResume(), {
      fonts: { nameFontSize: 36, lineHeight: 1.8 },
    })
    expect(result.issues.map(i => i.id)).toEqual(
      expect.arrayContaining(['name-font-size', 'line-height']),
    )
  })

  it('does not warn on typical 10pt / 22pt / 1.4 theme', () => {
    const result = runResumeLayoutCheck(baseResume(), {
      fonts: { bodyFontSize: 10, nameFontSize: 22, lineHeight: 1.4 },
    })
    expect(result.issues.map(i => i.id)).not.toEqual(
      expect.arrayContaining(['body-font-size', 'name-font-size', 'line-height']),
    )
  })

  it('warns on mixed date formats', () => {
    const resume = baseResume()
    resume.experience[0].startDate = 'Jan 2022'
    resume.experience[0].endDate = '2024'
    const result = runResumeLayoutCheck(resume)
    const issue = result.issues.find(i => i.id === 'inconsistent-dates')
    expect(issue?.severity).toBe('warning')
    expect(result.ok).toBe(true) // warnings never block export
  })

  it('does not warn when all dates share one format', () => {
    const resume = baseResume()
    resume.experience[0].startDate = 'Jan 2022'
    resume.experience[0].endDate = 'Mar 2024'
    const result = runResumeLayoutCheck(resume)
    expect(result.issues.map(i => i.id)).not.toContain('inconsistent-dates')
  })

  it('warns on AI-tell diction and em-dash overuse', () => {
    const result = runResumeLayoutCheck(
      baseResume({
        summary: 'Passionate engineer who leveraged cutting-edge synergy — a game-changer — truly.',
      }),
    )
    const issue = result.issues.find(i => i.id === 'ai-tell-diction')
    expect(issue?.severity).toBe('warning')
    expect(issue?.detail).toMatch(/leveraged|passionate/)
    expect(result.ok).toBe(true)
  })

  it('does not warn on clean human diction', () => {
    const result = runResumeLayoutCheck(baseResume())
    expect(result.issues.map(i => i.id)).not.toContain('ai-tell-diction')
  })

  it('warns on multi-column skills layout', () => {
    const result = runResumeLayoutCheck(baseResume(), { skillsLayout: 'columns' })
    expect(result.issues.map(i => i.id)).toContain('skills-columns')
    expect(result.ok).toBe(true)
  })
})
