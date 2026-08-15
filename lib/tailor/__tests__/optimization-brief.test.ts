import { describe, expect, it } from 'vitest'
import { buildOptimizationBrief } from '@/lib/tailor/optimization-brief'
import type { ATSScore, ResumeDiffChange } from '@/types'

const score: ATSScore = {
  total: 72,
  breakdown: { keywords: 70, skills: 65, experience: 80, format: 85, education: 60 },
  matched_keywords: ['REST'],
  missing_keywords: ['Kubernetes'],
  matched_skills: ['TypeScript'],
  missing_skills: ['AWS'],
  recommendations: [],
}

describe('buildOptimizationBrief', () => {
  it('explains interview odds and separates new vs rewrite', () => {
    const changes: ResumeDiffChange[] = [
      {
        id: '1',
        section: 'summary',
        field: 'text',
        before: 'Old',
        after: 'New for Apple IS&T',
        changeType: 'changed',
        reason: 'Named the role in the summary.',
      },
      {
        id: '2',
        section: 'experience',
        field: 'bullets',
        before: ['Built APIs'],
        after: ['Built APIs', 'Added GraphQL gateway'],
        changeType: 'changed',
        reason: 'New GraphQL bullet from Q&A.',
      },
    ]
    const brief = buildOptimizationBrief(score, changes, {
      title: 'Software Engineer',
      company: 'Apple',
      required_skills: [],
      preferred_skills: [],
      required_experience_years: 0,
      education_requirement: '',
      keywords: [],
      responsibilities: [],
      ats_system: '',
      red_flags: [],
      company_values: [],
      compensation: { min: null, max: null, currency: 'USD', period: 'annual' },
      work_type: 'hybrid',
      seniority: 'junior',
      summary: '',
    })
    expect(brief.headline).toContain('Apple')
    expect(brief.oddsLine).toContain('72%')
    expect(brief.newAdditions).toBe(1)
    expect(brief.rewrites).toBe(1)
    expect(brief.bullets.some(b => /AWS|Kubernetes/.test(b))).toBe(true)
  })
})
