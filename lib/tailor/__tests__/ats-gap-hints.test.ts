import { describe, expect, it } from 'vitest'
import {
  formatAtsGapsForPrompt,
  gapAnalysisFromAts,
  questionsFromAtsGaps,
  withAtsFallbackQuestions,
} from '@/lib/tailor/ats-gap-hints'
import type { ATSScore, GapAnalysis } from '@/types'

const score = (over: Partial<ATSScore> = {}): ATSScore => ({
  total: 55,
  breakdown: { keywords: 50, skills: 45, experience: 70, format: 80, education: 50 },
  matched_keywords: ['react'],
  missing_keywords: ['kubernetes', 'GraphQL'],
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

describe('questionsFromAtsGaps', () => {
  it('asks up to 3 unique missing skills/keywords', () => {
    const questions = questionsFromAtsGaps(score())
    expect(questions.length).toBeGreaterThan(0)
    expect(questions.length).toBeLessThanOrEqual(3)
    expect(questions.some(q => q.gap_being_filled === 'GraphQL')).toBe(true)
    expect(questions[0].choices?.length).toBeGreaterThan(1)
  })

  it('returns no questions when ATS is clean', () => {
    expect(
      questionsFromAtsGaps(
        score({ missing_skills: [], missing_keywords: [] }),
      ),
    ).toHaveLength(0)
  })
})

describe('withAtsFallbackQuestions', () => {
  it('keeps Claude questions when present', () => {
    const analysis: GapAnalysis = {
      ...gapAnalysisFromAts(score()),
      questions_for_user: [
        {
          id: 'q1',
          question: 'Did you use Kubernetes at Acme?',
          category: 'skills',
          gap_being_filled: 'Kubernetes',
          why_it_matters: 'JD requires it',
          example_answer: 'Yes',
        },
      ],
    }
    expect(withAtsFallbackQuestions(analysis, score()).questions_for_user[0].id).toBe('q1')
  })

  it('fills ATS questions when Claude returns none on a weak match', () => {
    const analysis = gapAnalysisFromAts(score())
    const next = withAtsFallbackQuestions(analysis, score())
    expect(next.questions_for_user.length).toBeGreaterThan(0)
  })
})

describe('formatAtsGapsForPrompt', () => {
  it('lists missing skills for the rewrite prompt', () => {
    const text = formatAtsGapsForPrompt(score())
    expect(text).toContain('AWS')
    expect(text).toContain('honest')
  })
})
