import { diffArrays } from 'diff'
import type { StructuredResume, ResumeDiffChange, JobExtractedData, ResumeExperience, ResumeProject } from '@/types'
import type { TailorCritiqueReport, TailorCritiqueFlag, WriteBackSuggestion } from './tailor-types'
import { TAILOR_MAX_RETRIES, TAILOR_OVERLAP_GATE } from './models'

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(v => typeof v === 'string') : []
}

/** Claude often omits arrays — fill so .join / .find never crash. */
export function normalizeStructuredResume(raw: Partial<StructuredResume> | null | undefined): StructuredResume {
  const r = raw ?? {}
  const skills = r.skills ?? { technical: [], soft: [], tools: [], languages: [] }
  return {
    contact: r.contact ?? {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: '',
      website: '',
    },
    summary: typeof r.summary === 'string' ? r.summary : '',
    experience: (Array.isArray(r.experience) ? r.experience : []).map((e, i) => ({
      id: e?.id || `exp_${i + 1}`,
      company: e?.company ?? '',
      title: e?.title ?? '',
      location: e?.location ?? '',
      startDate: e?.startDate ?? '',
      endDate: e?.endDate ?? '',
      current: Boolean(e?.current),
      bullets: asStringArray(e?.bullets),
      skills_used: asStringArray(e?.skills_used),
    })) as ResumeExperience[],
    education: Array.isArray(r.education) ? r.education : [],
    skills: {
      technical: asStringArray(skills.technical),
      soft: asStringArray(skills.soft),
      tools: asStringArray(skills.tools),
      languages: asStringArray(skills.languages),
    },
    projects: (Array.isArray(r.projects) ? r.projects : []).map((p, i) => ({
      id: p?.id || `proj_${i + 1}`,
      name: p?.name ?? '',
      description: p?.description ?? '',
      bullets: asStringArray(p?.bullets),
      technologies: asStringArray(p?.technologies),
      url: p?.url ?? '',
      github: p?.github ?? '',
    })) as ResumeProject[],
    certifications: Array.isArray(r.certifications) ? r.certifications : [],
    volunteer: Array.isArray(r.volunteer) ? r.volunteer : [],
    awards: Array.isArray(r.awards) ? r.awards : [],
    tailoring_notes: Array.isArray(r.tailoring_notes) ? r.tailoring_notes : undefined,
  }
}

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

export function shouldRetryLoop(_attempt: number, _critique: TailorCritiqueReport): boolean {
  return false
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
  const prev = normalizeStructuredResume(before)
  const next = normalizeStructuredResume(after)
  const changes: ResumeDiffChange[] = []
  const noteFor = (section: string) => notes?.find(n => n.section === section)?.reason

  if (prev.summary !== next.summary) {
    changes.push({
      section: 'summary',
      field: 'text',
      before: prev.summary,
      after: next.summary,
      changeType: 'changed',
      reason: noteFor('summary'),
    })
  }

  for (const exp of prev.experience) {
    const tailoredExp = next.experience.find(e => e.id === exp.id)
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

  for (const exp of next.experience) {
    if (!prev.experience.find(e => e.id === exp.id)) {
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

  const skillBefore = [...prev.skills.technical, ...prev.skills.tools]
  const skillAfter = [...next.skills.technical, ...next.skills.tools]
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

  for (const proj of prev.projects) {
    const tailoredProj = next.projects.find(p => p.id === proj.id)
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

/** Safety cap only — a master resume is typically 8–25k; never truncate to a few thousand. */
export const PROMPT_JSON_MAX = 80_000

export function jsonForPrompt(data: unknown, max = PROMPT_JSON_MAX): string {
  const json = JSON.stringify(data, null, 2)
  if (json.length <= max) return json
  return `${json.slice(0, max)}\n…[truncated]`
}

/** @deprecated Use jsonForPrompt — kept for older call sites. */
export function sliceForPrompt(data: unknown, max: number): string {
  return jsonForPrompt(data, max)
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
