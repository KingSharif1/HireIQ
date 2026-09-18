import { describe, expect, it } from 'vitest'
import {
  hasMaterialGapAnswers,
  isSkipGapAnswer,
  leftoverGapChips,
  SKIP_GAP_ANSWER,
} from '@/lib/tailor/ats-gap-hints'
import type { ATSScore } from '@/types'

const score = (missing_skills: string[]): ATSScore => ({
  total: 55,
  breakdown: { keywords: 50, skills: 45, experience: 70, format: 80, education: 50 },
  matched_keywords: [],
  missing_keywords: [],
  matched_skills: [],
  missing_skills,
  recommendations: [],
})

describe('draft-first leftover chips', () => {
  it('offers at most two optional chips after the draft', () => {
    const chips = leftoverGapChips(score(['n8n', 'Zapier', 'Make', 'Kafka']))
    expect(chips).toHaveLength(2)
    expect(chips[0].question).toMatch(/n8n/i)
    expect(chips[0].choices).toContain(SKIP_GAP_ANSWER)
  })

  it('treats skip answers as non-material so weave is not required', () => {
    const chips = leftoverGapChips(score(['n8n']))
    expect(isSkipGapAnswer(SKIP_GAP_ANSWER)).toBe(true)
    expect(hasMaterialGapAnswers({ [chips[0].id]: SKIP_GAP_ANSWER }, chips)).toBe(false)
    expect(
      hasMaterialGapAnswers(
        { [chips[0].id]: 'Yes — I used n8n on a class project to automate invoices' },
        chips,
      ),
    ).toBe(true)
  })
})
