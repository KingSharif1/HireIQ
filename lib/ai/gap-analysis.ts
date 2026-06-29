import type { AdjacentMatch, GapAnalysis, GapQuestion, RealGap } from '@/types'

const MAX_QUESTIONS = 3

export function normalizeGapAnalysis(raw: Partial<GapAnalysis>): GapAnalysis {
  const direct = (raw.direct_matches ?? []).filter(m => m?.jd_requirement?.trim())
  const adjacent = (raw.adjacent_matches ?? [])
    .filter(m => m?.jd_requirement?.trim() && m?.honest_framing?.trim())
  const real = (raw.real_gaps ?? []).filter(g => g?.jd_requirement?.trim())
  const questions = normalizeQuestions(raw.questions_for_user ?? [])

  return {
    direct_matches: direct.map(m => ({
      jd_requirement: m.jd_requirement.trim(),
      user_evidence: (m.user_evidence ?? '').trim(),
      source: (m.source ?? 'resume').trim(),
    })),
    adjacent_matches: adjacent.map(m => ({
      jd_requirement: m.jd_requirement.trim(),
      user_evidence: (m.user_evidence ?? '').trim(),
      honest_framing: m.honest_framing.trim(),
    })),
    real_gaps: real.map(g => ({
      jd_requirement: g.jd_requirement.trim(),
      note: (g.note ?? 'Not documented in profile.').trim(),
    })),
    questions_for_user: questions.slice(0, MAX_QUESTIONS),
  }
}

function normalizeQuestions(raw: Partial<GapQuestion>[]): GapQuestion[] {
  return raw
    .filter(q => q?.question?.trim())
    .map((q, i) => ({
      id: q.id?.trim() || `q${i + 1}`,
      question: q.question!.trim(),
      category: q.category ?? 'experience',
      gap_being_filled: (q.gap_being_filled ?? '').trim(),
      why_it_matters: (q.why_it_matters ?? 'Helps tailor your resume to this role.').trim(),
      example_answer: (q.example_answer ?? '').trim(),
      choices: (q.choices ?? []).filter(Boolean).slice(0, 4),
    }))
}

export function formatRealGapsForPrompt(gaps: RealGap[]): string {
  if (gaps.length === 0) return 'None identified — do not invent requirements beyond profile + Q&A.'
  return gaps.map(g => `- ${g.jd_requirement}: ${g.note}`).join('\n')
}

export function formatAdjacentForPrompt(matches: AdjacentMatch[]): string {
  if (matches.length === 0) return 'None — use only direct evidence from profile + Q&A.'
  return matches
    .map(m => `- JD wants "${m.jd_requirement}" → evidence: ${m.user_evidence} → frame as: ${m.honest_framing}`)
    .join('\n')
}

export function gapAnalysisSummaryCounts(analysis: GapAnalysis) {
  return {
    direct: analysis.direct_matches.length,
    adjacent: analysis.adjacent_matches.length,
    gaps: analysis.real_gaps.length,
    questions: analysis.questions_for_user.length,
  }
}
