import type { ATSScore, JobExtractedData, ResumeDiffChange } from '@/types'
import { addedLines, changeLocationLabel, describeResumeChange, isNewAddition } from '@/lib/tailor/change-copy'

export type OptimizationBrief = {
  headline: string
  oddsLine: string
  bullets: string[]
  newAdditions: number
  rewrites: number
}

function interviewOddsLine(total: number): string {
  if (total >= 80) {
    return `At ${total}% match, this draft is in a strong range for both ATS screens and a human recruiter skim.`
  }
  if (total >= 65) {
    return `At ${total}% match, you clear many ATS keyword checks — close remaining gaps with honest bullets to push interview odds higher.`
  }
  if (total >= 50) {
    return `At ${total}% match, ATS may still filter you out. Weave missing skills you actually have into real bullets.`
  }
  return `At ${total}% match, this draft is under-optimized for this posting. Answer gap questions and add only true evidence.`
}

/** Plain-language summary of how this tailored draft improves interview chances. */
export function buildOptimizationBrief(
  score: ATSScore | null | undefined,
  changes: ResumeDiffChange[],
  job?: JobExtractedData | null
): OptimizationBrief {
  const newAdditions = changes.filter(isNewAddition).length
  const rewrites = changes.length - newAdditions
  const role = job?.title ? `${job.title}${job.company ? ` at ${job.company}` : ''}` : 'this role'

  const bullets: string[] = []
  if (rewrites > 0) {
    bullets.push(
      `${rewrites} section${rewrites === 1 ? '' : 's'} reframed in this job’s language (existing experience — no accept needed).`
    )
  }
  if (newAdditions > 0) {
    bullets.push(
      `${newAdditions} new addition${newAdditions === 1 ? '' : 's'} need your OK before they stay on the resume.`
    )
  }
  if (score) {
    const closed =
      score.matched_skills.length + score.matched_keywords.length
    if (closed > 0) {
      bullets.push(
        `ATS already sees ${score.matched_skills.length} matched skill${score.matched_skills.length === 1 ? '' : 's'} and ${score.matched_keywords.length} keyword hit${score.matched_keywords.length === 1 ? '' : 's'}.`
      )
    }
    const missing = [...score.missing_skills, ...score.missing_keywords].slice(0, 5)
    if (missing.length) {
      bullets.push(
        `Still open for ATS: ${missing.join(', ')} — only add if true.`
      )
    }
  }

  for (const change of changes.slice(0, 4)) {
    const where = changeLocationLabel(change)
    const why = describeResumeChange(change)
    const sample = addedLines(change)[0]
    bullets.push(
      sample
        ? `${where}: ${why} Example: “${sample.length > 90 ? `${sample.slice(0, 90)}…` : sample}”`
        : `${where}: ${why}`
    )
  }

  const unique = [...new Set(bullets)].slice(0, 8)

  return {
    headline:
      changes.length > 0
        ? `Optimized for ${role}`
        : `Ready to optimize for ${role}`,
    oddsLine: score ? interviewOddsLine(score.total) : 'Save or tailor to score this draft against the job.',
    bullets: unique,
    newAdditions,
    rewrites,
  }
}
