import type { ATSScore, GapAnalysis, GapQuestion } from '@/types'

const MAX_ATS_QUESTIONS = 3
const MAX_OPTIONAL_CHIPS = 2

export const SKIP_GAP_ANSWER = 'Skip — leave it off'

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

/**
 * After a draft exists: 0–2 optional chips for JD tools still missing.
 * Never blocks the resume. Skip = leave the term off.
 */
export function leftoverGapChips(score: ATSScore, limit = MAX_OPTIONAL_CHIPS): GapQuestion[] {
  return uniqueGaps(score).slice(0, limit).map((item, i) => ({
    id: `opt-q${i + 1}`,
    question: `This job asks for ${item} — add it if you’ve actually used it.`,
    category: 'skills',
    gap_being_filled: item,
    why_it_matters: `It is on the posting and not on this version. Only add it with a real example. If you have not used it, skip and we leave it off.`,
    example_answer: `Yes — I used ${item} on [project or class] to …`,
    choices: [
      `Yes — I have used ${item}`,
      SKIP_GAP_ANSWER,
    ],
  }))
}

export function isSkipGapAnswer(answer: string | undefined): boolean {
  const t = (answer ?? '').trim().toLowerCase()
  if (!t) return true
  return t === SKIP_GAP_ANSWER.toLowerCase() || t.startsWith('skip') || t.includes('leave it off')
}

/** True when the user added at least one real example we can weave in. */
export function hasMaterialGapAnswers(
  answers: Record<string, string>,
  questions: GapQuestion[],
): boolean {
  return questions.some(q => {
    const value = answers[q.id]
    if (!value?.trim()) return false
    return !isSkipGapAnswer(value)
  })
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
