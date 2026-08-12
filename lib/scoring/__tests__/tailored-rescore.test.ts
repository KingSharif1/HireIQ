import { describe, expect, it } from 'vitest'
import { scoreTailoredWithDecisions } from '@/lib/scoring/tailored-rescore'
import { sampleStructuredResume } from '@/lib/profile/__tests__/fixtures'
import type { ResumeDiffChange } from '@/types'

describe('scoreTailoredWithDecisions', () => {
  it('scores approved resume after declining a summary change', () => {
    const original = sampleStructuredResume()
    const tailored = structuredClone(original)
    tailored.summary = 'Rewritten summary with React and TypeScript expertise.'

    const changes: ResumeDiffChange[] = [{
      section: 'summary',
      field: 'text',
      before: original.summary,
      after: tailored.summary,
      changeType: 'changed',
    }]

    const accepted = scoreTailoredWithDecisions({
      original,
      tailored,
      changes,
      changeDecisions: { 'summary:text:::0': { status: 'accepted' } },
      jobExtractedData: { required_skills: ['React', 'TypeScript'], keywords: ['React'] },
    })

    const declined = scoreTailoredWithDecisions({
      original,
      tailored,
      changes,
      changeDecisions: { 'summary:text:::0': { status: 'declined' } },
      jobExtractedData: { required_skills: ['React', 'TypeScript'], keywords: ['React'] },
    })

    expect(accepted.score.total).toBeGreaterThanOrEqual(declined.score.total)
    expect(Number.isFinite(accepted.matchScore)).toBe(true)
  })
})
