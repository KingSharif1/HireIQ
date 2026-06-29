import { describe, it, expect } from 'vitest'
import {
  formatAdjacentForPrompt,
  formatRealGapsForPrompt,
  normalizeGapAnalysis,
} from '@/lib/ai/gap-analysis'

describe('gap-analysis', () => {
  it('normalizes and caps questions at 3', () => {
    const raw = {
      direct_matches: [{ jd_requirement: 'React', user_evidence: 'Built UI', source: 'project' }],
      adjacent_matches: [{ jd_requirement: 'K8s', user_evidence: 'Docker compose', honest_framing: 'container-adjacent' }],
      real_gaps: [{ jd_requirement: 'SAP', note: 'No exposure' }],
      questions_for_user: [
        { id: 'q1', question: 'Q1?', category: 'skills' as const, gap_being_filled: '', why_it_matters: '', example_answer: '' },
        { id: 'q2', question: 'Q2?', category: 'skills' as const, gap_being_filled: '', why_it_matters: '', example_answer: '' },
        { id: 'q3', question: 'Q3?', category: 'skills' as const, gap_being_filled: '', why_it_matters: '', example_answer: '' },
        { id: 'q4', question: 'Q4?', category: 'skills' as const, gap_being_filled: '', why_it_matters: '', example_answer: '' },
      ],
    }
    const result = normalizeGapAnalysis(raw)
    expect(result.direct_matches).toHaveLength(1)
    expect(result.adjacent_matches[0].honest_framing).toBe('container-adjacent')
    expect(result.questions_for_user).toHaveLength(3)
  })

  it('filters adjacent without honest_framing', () => {
    const result = normalizeGapAnalysis({
      adjacent_matches: [{ jd_requirement: 'X', user_evidence: 'Y', honest_framing: '' }],
    })
    expect(result.adjacent_matches).toHaveLength(0)
  })

  it('formats gaps for tailor prompt', () => {
    const text = formatRealGapsForPrompt([{ jd_requirement: 'SAP', note: 'No exposure' }])
    expect(text).toContain('SAP')
    expect(formatRealGapsForPrompt([])).toContain('None identified')
  })

  it('formats adjacent matches for tailor prompt', () => {
    const text = formatAdjacentForPrompt([
      { jd_requirement: 'K8s', user_evidence: 'Docker', honest_framing: 'container ops' },
    ])
    expect(text).toContain('container ops')
  })
})
