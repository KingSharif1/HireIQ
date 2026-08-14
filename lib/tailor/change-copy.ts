import type { ResumeDiffChange, TailoringNote } from '@/types'

export type PreviewHighlights = {
  summary: boolean
  skills: boolean
  experienceIds: Set<string>
  projectIds: Set<string>
  bullets: Set<string>
  selectedId: string | null
}

function asLines(value: string | string[] | undefined): string[] {
  if (!value) return []
  return (Array.isArray(value) ? value : [value]).map(v => v.trim()).filter(Boolean)
}

export function normalizeNoteSection(section: string): string {
  const t = section.toLowerCase()
  if (t.includes('summar')) return 'summary'
  if (t.includes('skill')) return 'skills'
  if (t.includes('project')) return 'projects'
  if (t.includes('educat')) return 'education'
  return 'experience'
}

function fallbackReason(section: string, hint?: string): string {
  const where = hint ? ` in ${hint}` : ''
  switch (normalizeNoteSection(section)) {
    case 'summary':
      return 'Rewrote the summary so a recruiter sees this job’s title and your real proof in a few seconds — not a generic bio.'
    case 'skills':
      return 'Reordered skills so the ones this job asks for show first (only skills you already have).'
    case 'projects':
      return `Tightened project bullets${where} toward this job’s tools and outcomes.`
    case 'experience':
      return `Reframed bullets${where} in this job’s language so ATS and a recruiter both see the match.`
    default:
      return 'Updated this section so it helps this specific job without inventing experience.'
  }
}

function noteMatches(note: TailoringNote, section: string, afterText: string, hint?: string): boolean {
  if (normalizeNoteSection(note.section) !== normalizeNoteSection(section)) {
    if (hint && !note.section.toLowerCase().includes(hint.toLowerCase())) return false
    if (!hint) return false
  }
  const change = (note.change ?? '').trim()
  if (!change) return Boolean(note.reason?.trim())
  const needle = change.slice(0, 48).toLowerCase()
  const hay = afterText.toLowerCase()
  return hay.includes(needle) || needle.includes(hay.slice(0, 48))
}

/** Prefer Claude’s concrete note; never leave the review UI with an empty “why”. */
export function reasonForChange(
  notes: TailoringNote[] | undefined,
  section: string,
  after: string | string[],
  hint?: string,
): string {
  const afterText = asLines(after).join('\n')
  const list = notes ?? []
  const matched =
    list.find(n => noteMatches(n, section, afterText, hint) && n.reason?.trim()) ??
    list.find(n => normalizeNoteSection(n.section) === normalizeNoteSection(section) && n.reason?.trim())
  const reason = matched?.reason?.trim()
  if (reason && !/improved wording|tailored for the role|updated for (the )?job/i.test(reason)) {
    return reason
  }
  return fallbackReason(section, hint)
}

export function describeResumeChange(change: ResumeDiffChange): string {
  if (change.reason?.trim()) return change.reason.trim()
  return fallbackReason(change.section)
}

export function changeLocationLabel(change: ResumeDiffChange): string {
  if (change.section === 'summary') return 'Summary'
  if (change.section === 'skills') return 'Skills'
  if (change.section === 'projects') return 'Projects'
  if (change.section === 'experience') return 'Experience'
  return change.section
}

export function addedLines(change: ResumeDiffChange): string[] {
  const before = new Set(asLines(change.before))
  return asLines(change.after).filter(line => !before.has(line))
}

export function highlightsFromChanges(
  changes: ResumeDiffChange[],
  selectedId: string | null = null,
): PreviewHighlights {
  const experienceIds = new Set<string>()
  const projectIds = new Set<string>()
  const bullets = new Set<string>()
  let summary = false
  let skills = false

  const focused = selectedId ? changes.filter(c => (c.id ?? '') === selectedId) : changes
  const list = focused.length > 0 ? focused : changes

  for (const change of list) {
    if (change.section === 'summary') summary = true
    if (change.section === 'skills') skills = true
    if (change.expId) experienceIds.add(change.expId)
    if (change.projId) projectIds.add(change.projId)
    for (const line of addedLines(change)) bullets.add(line)
    if (change.section === 'summary' && typeof change.after === 'string') {
      bullets.add(change.after)
    }
  }

  return { summary, skills, experienceIds, projectIds, bullets, selectedId }
}
