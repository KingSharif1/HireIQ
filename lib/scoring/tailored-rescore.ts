import { buildApprovedResume } from '@/lib/tailor/change-decisions'
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
