import type { ATSScore, GapAnalysis } from '@/types'

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
