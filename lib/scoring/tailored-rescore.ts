import { buildApprovedResume, getChangeId } from '@/lib/tailor/change-decisions'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import type {
  ATSScore,
  ChangeDecision,
  JobExtractedData,
  ResumeDiffChange,
  StructuredResume,
} from '@/types'

export interface TailoredRescoreInput {
  original: StructuredResume
  tailored: StructuredResume
  changes: ResumeDiffChange[]
  changeDecisions: Record<string, ChangeDecision>
  jobExtractedData: JobExtractedData | Partial<JobExtractedData>
}

/** Build approved resume from decisions and score against job extracted data. */
export function scoreTailoredWithDecisions(input: TailoredRescoreInput): {
  approved: StructuredResume
  score: ATSScore
  matchScore: number
} {
  const approved = buildApprovedResume(
    input.original,
    input.tailored,
    input.changes,
    input.changeDecisions
  )
  const score = calculateATSScore(approved, input.jobExtractedData)
  const matchScore = calculateATSScore(input.original, input.jobExtractedData).total
  return { approved, score, matchScore }
}

export interface ChangeScoreImpact {
  /** Points vs keeping the original for this change only. */
  delta: number
  keywordsGained: string[]
  keywordsLost: string[]
  skillsGained: string[]
  skillsLost: string[]
  withTotal: number
  withoutTotal: number
}

/**
 * ATS impact of keeping this change (accepted / edited / pending-as-proposed)
 * versus declining it (original text). Other decisions stay as-is.
 */
export function scoreImpactForChange(input: {
  original: StructuredResume
  tailored: StructuredResume
  changes: ResumeDiffChange[]
  decisions: Record<string, ChangeDecision>
  change: ResumeDiffChange
  changeIndex: number
  jobExtractedData: JobExtractedData | Partial<JobExtractedData>
}): ChangeScoreImpact {
  const id = getChangeId(input.change, input.changeIndex)
  const current = input.decisions[id]
  const keepDecision: ChangeDecision =
    current?.status === 'edited'
      ? { status: 'edited', editedValue: current.editedValue }
      : { status: 'accepted' }

  const without = scoreTailoredWithDecisions({
    original: input.original,
    tailored: input.tailored,
    changes: input.changes,
    changeDecisions: { ...input.decisions, [id]: { status: 'declined' } },
    jobExtractedData: input.jobExtractedData,
  })
  const withIt = scoreTailoredWithDecisions({
    original: input.original,
    tailored: input.tailored,
    changes: input.changes,
    changeDecisions: { ...input.decisions, [id]: keepDecision },
    jobExtractedData: input.jobExtractedData,
  })

  const withoutKeys = new Set(without.score.matched_keywords.map(k => k.toLowerCase()))
  const withKeys = new Set(withIt.score.matched_keywords.map(k => k.toLowerCase()))
  const withoutSkills = new Set(without.score.matched_skills.map(k => k.toLowerCase()))
  const withSkills = new Set(withIt.score.matched_skills.map(k => k.toLowerCase()))

  return {
    delta: withIt.score.total - without.score.total,
    withTotal: withIt.score.total,
    withoutTotal: without.score.total,
    keywordsGained: withIt.score.matched_keywords.filter(k => !withoutKeys.has(k.toLowerCase())),
    keywordsLost: without.score.matched_keywords.filter(k => !withKeys.has(k.toLowerCase())),
    skillsGained: withIt.score.matched_skills.filter(k => !withoutSkills.has(k.toLowerCase())),
    skillsLost: without.score.matched_skills.filter(k => !withSkills.has(k.toLowerCase())),
  }
}
