import type { ATSScore, GapAnalysis, GapQuestion } from '@/types'

const MAX_ATS_QUESTIONS = 3

/** Deterministic gap hints from ATS pre-scan — no Claude call needed. */
export function gapAnalysisFromAts(score: ATSScore): GapAnalysis {
  return {
    direct_matches: score.matched_skills.slice(0, 8).map(skill => ({
      jd_requirement: skill,
      user_evidence: `Listed in profile/resume skills or experience`,
      source: 'skill',
    })),
    adjacent_matches: [],
    real_gaps: [
      ...score.missing_skills.slice(0, 6).map(skill => ({
        jd_requirement: skill,
        note: 'Missing from resume — do not invent; reframe only if adjacent evidence exists.',
      })),
      ...score.missing_keywords.slice(0, 4).map(kw => ({
        jd_requirement: kw,
        note: 'Keyword gap from job description — use only if honestly supported.',
      })),
    ],
    questions_for_user: [],
  }
}

function uniqueGaps(score: ATSScore): string[] {
  const seen = new Set<string>()
  const items: string[] = []
  for (const item of [...score.missing_skills, ...score.missing_keywords]) {
    const key = item.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    items.push(item.trim())
  }
  return items
}

/**
 * When Claude returns no questions but ATS still has missing skills/keywords,
 * ask the candidate whether they have honest evidence we can weave in.
 */
export function questionsFromAtsGaps(score: ATSScore, limit = MAX_ATS_QUESTIONS): GapQuestion[] {
  return uniqueGaps(score).slice(0, limit).map((item, i) => ({
    id: `ats-q${i + 1}`,
    question: `Have you used ${item} in a job, internship, class, or project — even if it is not written on your resume yet?`,
    category: 'skills',
    gap_being_filled: item,
    why_it_matters: `This job lists ${item}. If you have real experience, we can put it in a bullet so ATS and a recruiter both see the match. If you have not used it, we will leave it off.`,
    example_answer: `Yes — I used ${item} at [role or project] to …`,
    choices: [
      `Yes — used it at work`,
      `Yes — class or side project`,
      `Similar tool — adjacent`,
      `No — skip this`,
    ],
  }))
}

/** Keep Claude's questions when present; otherwise ask ATS-derived ones so we do not skip Q&A on a 50% match. */
export function withAtsFallbackQuestions(analysis: GapAnalysis, score: ATSScore): GapAnalysis {
  if (analysis.questions_for_user.length > 0) return analysis
  const questions = questionsFromAtsGaps(score)
  if (questions.length === 0) return analysis
  return { ...analysis, questions_for_user: questions }
}

export function formatAtsGapsForPrompt(score: ATSScore): string {
  const skills = score.missing_skills.slice(0, 8)
  const keywords = score.missing_keywords.slice(0, 8)
  if (skills.length === 0 && keywords.length === 0) {
    return 'ATS pre-scan found no missing skills/keywords. Still rewrite summary + bullets in this job’s language using real evidence.'
  }
  const lines: string[] = []
  if (skills.length) lines.push(`Missing skills: ${skills.join(', ')}`)
  if (keywords.length) lines.push(`Missing keywords: ${keywords.join(', ')}`)
  lines.push(
    'Close these only with honest evidence from the resume, GitHub, or Q&A. Do not stuff unmatched terms.',
  )
  return lines.join('\n')
}
