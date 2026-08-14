import { describe, expect, it } from 'vitest'
import { gapAnalysisFromAts } from '@/lib/tailor/ats-gap-hints'
import type { ATSScore } from '@/types'

const score = (over: Partial<ATSScore> = {}): ATSScore => ({
  total: 62,
  breakdown: { keywords: 60, skills: 55, experience: 70, format: 80, education: 50 },
  matched_keywords: ['react'],
  missing_keywords: ['kubernetes'],
  matched_skills: ['TypeScript'],
  missing_skills: ['GraphQL', 'AWS'],
  recommendations: [],
  ...over,
})

describe('gapAnalysisFromAts', () => {
  it('maps missing skills to real_gaps with no questions', () => {
    const analysis = gapAnalysisFromAts(score())
    expect(analysis.real_gaps.some(g => g.jd_requirement === 'GraphQL')).toBe(true)
    expect(analysis.questions_for_user).toHaveLength(0)
    expect(analysis.direct_matches.some(m => m.jd_requirement === 'TypeScript')).toBe(true)
  })
})
