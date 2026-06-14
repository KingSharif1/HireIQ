import { diffArrays } from 'diff'
import type { StructuredResume, ResumeDiffChange, JobExtractedData } from '@/types'
import type { TailorCritiqueReport, TailorCritiqueFlag, WriteBackSuggestion } from './tailor-types'
import { TAILOR_MAX_RETRIES, TAILOR_OVERLAP_GATE } from './models'

export function seniorityLengthBudget(seniority: string): string {
  const s = seniority.toLowerCase()
  if (['senior', 'lead', 'staff', 'principal'].some(level => s.includes(level))) {
    return 'up to 2 pages — senior/lead; keep only strong relevant content'
  }
  return '1 page — junior/mid; trim weak bullets rather than pad'
}

export function passesTailorGate(critique: TailorCritiqueReport): boolean {
  const unsupported = critique.flags.filter(f => f.type === 'unsupported_claim')
  return critique.language_overlap_percent >= TAILOR_OVERLAP_GATE && unsupported.length === 0
}

export function shouldRetryLoop(attempt: number, critique: TailorCritiqueReport): boolean {
  return attempt < TAILOR_MAX_RETRIES && !passesTailorGate(critique)
}

export function normalizeCritique(raw: Partial<TailorCritiqueReport>): TailorCritiqueReport {
  const flags = (raw.flags ?? []).map(f => ({
    type: f.type ?? 'vague',
    section: f.section ?? 'summary',
    field: f.field,
    expId: f.expId,
    detail: f.detail ?? '',
  })) as TailorCritiqueReport['flags']

  const overlap = Math.min(100, Math.max(0, Number(raw.language_overlap_percent) || 0))
  const unsupported = flags.filter(f => f.type === 'unsupported_claim')

  return {
    language_overlap_percent: overlap,
    ats_pass: raw.ats_pass ?? overlap >= TAILOR_OVERLAP_GATE,
    human_pass: raw.human_pass ?? unsupported.length === 0,
    flags,
    weak_sections: raw.weak_sections?.length ? raw.weak_sections : inferWeakSections(flags),
    suggestions: raw.suggestions ?? [],
  }
}

function inferWeakSections(flags: TailorCritiqueFlag[]): string[] {
  const sections = new Set<string>()
  for (const f of flags) {
    if (f.expId) sections.add(`experience:${f.expId}`)
    else sections.add(f.section)
  }
  return [...sections]
}

export function buildResumeChanges(
  before: StructuredResume,
  after: StructuredResume,
  notes?: { section: string; reason: string }[]
): ResumeDiffChange[] {
  const changes: ResumeDiffChange[] = []
  const noteFor = (section: string) => notes?.find(n => n.section === section)?.reason

  if (before.summary !== after.summary) {
    changes.push({
      section: 'summary',
      field: 'text',
      before: before.summary,
      after: after.summary,
      changeType: 'changed',
      reason: noteFor('summary'),
    })
  }

  for (const exp of before.experience) {
    const tailoredExp = after.experience.find(e => e.id === exp.id)
    if (!tailoredExp) {
      changes.push({
        section: 'experience',
        field: 'entry',
        expId: exp.id,
        before: `${exp.title} @ ${exp.company}`,
        after: '',
        changeType: 'removed',
      })
      continue
    }
    const diff = diffArrays(exp.bullets, tailoredExp.bullets)
    if (diff.some(d => d.added || d.removed)) {
      changes.push({
        section: 'experience',
        field: 'bullets',
        expId: exp.id,
        before: exp.bullets,
        after: tailoredExp.bullets,
        changeType: bulletChangeType(exp.bullets, tailoredExp.bullets),
        reason: noteFor('experience'),
      })
    }
  }

  for (const exp of after.experience) {
    if (!before.experience.find(e => e.id === exp.id)) {
      changes.push({
        section: 'experience',
        field: 'entry',
        expId: exp.id,
        before: '',
        after: `${exp.title} @ ${exp.company}`,
        changeType: 'added',
      })
    }
  }

  const skillBefore = [...(before.skills?.technical ?? []), ...(before.skills?.tools ?? [])]
  const skillAfter = [...(after.skills?.technical ?? []), ...(after.skills?.tools ?? [])]
  if (skillBefore.join('|') !== skillAfter.join('|')) {
    changes.push({
      section: 'skills',
      field: 'technical',
      before: skillBefore,
      after: skillAfter,
      changeType: 'reordered',
      reason: noteFor('skills'),
    })
  }

  for (const proj of before.projects) {
    const tailoredProj = after.projects.find(p => p.id === proj.id)
    if (tailoredProj && proj.bullets.join('|') !== tailoredProj.bullets.join('|')) {
      changes.push({
        section: 'projects',
        field: 'bullets',
        projId: proj.id,
        before: proj.bullets,
        after: tailoredProj.bullets,
        changeType: 'changed',
        reason: noteFor('projects'),
      })
    }
  }

  return changes
}

function bulletChangeType(before: string[], after: string[]): ResumeDiffChange['changeType'] {
  if (after.length > before.length) return 'added'
  if (after.length < before.length) return 'removed'
  return 'changed'
}

/** Draft write-back suggestions from Q&A answers (Phase 3 will persist). */
export function buildWriteBackSuggestions(
  answers: Record<string, string>,
  jobTitle: string
): WriteBackSuggestion[] {
  return Object.entries(answers)
    .filter(([, answer]) => answer.trim().length > 20)
    .map(([questionId, answer], i) => ({
      id: `wb-${questionId}-${i}`,
      section: 'experience' as const,
      proposedText: answer.trim(),
      reason: `From your answer for ${jobTitle} — review before adding to master profile.`,
      sourceQuestionId: questionId,
    }))
}

/**
 * Format Q&A answers for the tailoring prompt.
 * `labels` maps questionId → the real question text so the model sees the actual
 * question (not a meaningless "q1" id). Falls back to the id if no label is known.
 */
export function formatEnhancements(
  answers: Record<string, string>,
  labels?: Record<string, string>
): string {
  const entries = Object.entries(answers || {}).filter(([, a]) => a.trim())
  if (entries.length === 0) return 'No additional information provided.'
  return entries.map(([id, a]) => `Q: ${labels?.[id] ?? id}\nA: ${a}`).join('\n\n')
}

export function sliceForPrompt(data: unknown, max: number): string {
  return JSON.stringify(data, null, 2).slice(0, max)
}

export function pickBestAttempt(
  attempts: { resume: StructuredResume; critique: TailorCritiqueReport }[]
): { resume: StructuredResume; critique: TailorCritiqueReport } {
  return attempts.reduce((best, cur) => {
    const bestUnsupported = best.critique.flags.filter(f => f.type === 'unsupported_claim').length
    const curUnsupported = cur.critique.flags.filter(f => f.type === 'unsupported_claim').length
    if (curUnsupported < bestUnsupported) return cur
    if (curUnsupported > bestUnsupported) return best
    if (cur.critique.language_overlap_percent > best.critique.language_overlap_percent) return cur
    return best
  })
}

export function buildTailorWarning(critique: TailorCritiqueReport): string | undefined {
  if (passesTailorGate(critique)) return undefined
  const parts: string[] = []
  if (critique.language_overlap_percent < TAILOR_OVERLAP_GATE) {
    parts.push(`language overlap ${critique.language_overlap_percent}% (target ${TAILOR_OVERLAP_GATE}%+)`)
  }
  const unsupported = critique.flags.filter(f => f.type === 'unsupported_claim')
  if (unsupported.length > 0) {
    parts.push(`${unsupported.length} unsupported claim flag(s)`)
  }
  return `Best available draft after ${TAILOR_MAX_RETRIES} retries. Review recommended: ${parts.join('; ')}.`
}
