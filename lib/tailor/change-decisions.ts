import type { ChangeDecision, ResumeDiffChange, StructuredResume } from '@/types'

/** Stable id for a diff row (used as key in change_decisions). */
export function getChangeId(change: ResumeDiffChange, index: number): string {
  return change.id ?? `${change.section}:${change.field}:${change.expId ?? ''}:${change.projId ?? ''}:${index}`
}

/** Attach ids to changes when missing (persisted with tailored resume). */
export function withChangeIds(changes: ResumeDiffChange[]): ResumeDiffChange[] {
  return changes.map((c, i) => ({ ...c, id: getChangeId(c, i) }))
}

function decisionStatus(
  decisions: Record<string, ChangeDecision>,
  changeId: string
): ChangeDecision['status'] {
  return decisions[changeId]?.status ?? 'accepted'
}

function applyFieldChange(
  resume: StructuredResume,
  change: ResumeDiffChange,
  value: string | string[]
): StructuredResume {
  const next = structuredClone(resume)

  if (change.section === 'summary' && change.field === 'text') {
    next.summary = value as string
    return next
  }

  if (change.section === 'experience' && change.expId) {
    const exp = next.experience.find(e => e.id === change.expId)
    if (exp && change.field === 'bullets') {
      exp.bullets = value as string[]
    }
    return next
  }

  if (change.section === 'projects' && change.projId && change.field === 'bullets') {
    const proj = next.projects.find(p => p.id === change.projId)
    if (proj) proj.bullets = value as string[]
    return next
  }

  if (change.section === 'skills') {
    next.skills = structuredClone(resume.skills)
    return next
  }

  return next
}

function revertChange(
  resume: StructuredResume,
  original: StructuredResume,
  change: ResumeDiffChange
): StructuredResume {
  const next = structuredClone(resume)

  if (change.section === 'summary' && change.field === 'text') {
    next.summary = original.summary
    return next
  }

  if (change.section === 'experience' && change.expId) {
    if (change.field === 'entry' && change.changeType === 'added') {
      next.experience = next.experience.filter(e => e.id !== change.expId)
      return next
    }
    if (change.field === 'entry' && change.changeType === 'removed') {
      const orig = original.experience.find(e => e.id === change.expId)
      if (orig) next.experience.push(structuredClone(orig))
      return next
    }
    const exp = next.experience.find(e => e.id === change.expId)
    const origExp = original.experience.find(e => e.id === change.expId)
    if (exp && origExp && change.field === 'bullets') {
      exp.bullets = [...origExp.bullets]
    }
    return next
  }

  if (change.section === 'projects' && change.projId && change.field === 'bullets') {
    const proj = next.projects.find(p => p.id === change.projId)
    const origProj = original.projects.find(p => p.id === change.projId)
    if (proj && origProj) proj.bullets = [...origProj.bullets]
    return next
  }

  if (change.section === 'skills') {
    next.skills = structuredClone(original.skills)
    return next
  }

  return next
}

/**
 * Start from the AI draft, revert declined/pending edits, apply manual edits.
 * Empty decisions = all accepted (legacy tailored rows).
 */
export function buildApprovedResume(
  original: StructuredResume,
  tailored: StructuredResume,
  changes: ResumeDiffChange[],
  decisions: Record<string, ChangeDecision> = {}
): StructuredResume {
  if (changes.length === 0) return structuredClone(tailored)

  let result = structuredClone(tailored)

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]
    const id = getChangeId(change, i)
    const status = decisionStatus(decisions, id)

    if (status === 'accepted') continue

    if (status === 'edited' && decisions[id]?.editedValue !== undefined) {
      result = applyFieldChange(result, change, decisions[id].editedValue!)
      continue
    }

    if (status === 'declined' || status === 'pending') {
      result = revertChange(result, original, change)
    }
  }

  return result
}

export function countPendingDecisions(
  changes: ResumeDiffChange[],
  decisions: Record<string, ChangeDecision>
): number {
  return changes.filter((c, i) => decisionStatus(decisions, getChangeId(c, i)) === 'pending').length
}

export function initialDecisions(changes: ResumeDiffChange[]): Record<string, ChangeDecision> {
  const out: Record<string, ChangeDecision> = {}
  for (let i = 0; i < changes.length; i++) {
    out[getChangeId(changes[i], i)] = { status: 'pending' }
  }
  return out
}

export function setAllDecisions(
  changes: ResumeDiffChange[],
  current: Record<string, ChangeDecision>,
  status: 'accepted' | 'declined',
  declineMeta?: Pick<ChangeDecision, 'declineReason' | 'declineReasonCode'>
): Record<string, ChangeDecision> {
  const next = { ...current }
  for (let i = 0; i < changes.length; i++) {
    const id = getChangeId(changes[i], i)
    next[id] = status === 'declined'
      ? { status, ...declineMeta }
      : { status }
  }
  return next
}
