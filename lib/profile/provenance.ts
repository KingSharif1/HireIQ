import type {
  ProfileData,
  PendingSuggestion,
  ProvenanceEntry,
  ResumeExperience,
} from '@/types'
import { uid, emptyProfileData } from './data'
import { bulletsWithIds, isHeavyEdit } from './bullets'
import type { WriteBackSuggestion } from '@/lib/ai/tailor-types'

export function normalizeProfileData(data: ProfileData): ProfileData {
  const base = emptyProfileData()
  return {
    ...base,
    ...data,
    personal: { ...base.personal, ...data.personal },
    skills: { ...base.skills, ...data.skills },
    provenance: data.provenance ?? {},
    pendingSuggestions: data.pendingSuggestions ?? [],
    experience: data.experience.map(ensureExperienceBulletIds),
    projects: data.projects.map(p => {
      const { bullets, bulletIds } = bulletsWithIds(p.bullets, p.bulletIds, 'pbul')
      return { ...p, bullets, bulletIds }
    }),
    volunteering: data.volunteering.map(v => {
      const { bullets, bulletIds } = bulletsWithIds(v.bullets, v.bulletIds, 'vbul')
      return { ...v, bullets, bulletIds }
    }),
  }
}

function ensureExperienceBulletIds(exp: ResumeExperience): ResumeExperience {
  const { bullets, bulletIds } = bulletsWithIds(exp.bullets, exp.bulletIds, 'bul')
  return { ...exp, bullets, bulletIds }
}

export function pendingCountForSection(data: ProfileData, section: PendingSuggestion['section']): number {
  return (data.pendingSuggestions ?? []).filter(s => s.section === section).length
}

export function mergePendingSuggestions(
  existing: PendingSuggestion[],
  incoming: PendingSuggestion[]
): PendingSuggestion[] {
  const byId = new Map(existing.map(s => [s.id, s]))
  for (const s of incoming) {
    if (!byId.has(s.id)) byId.set(s.id, s)
  }
  return [...byId.values()]
}

export function writeBackToPending(
  suggestions: WriteBackSuggestion[],
  tailoredResumeId: string,
  jobLabel: string,
  targetEntryId?: string
): PendingSuggestion[] {
  const now = new Date().toISOString()
  return suggestions.map(s => ({
    id: s.id,
    section: s.section,
    targetEntryId: s.targetEntryId ?? targetEntryId,
    proposedText: s.proposedText,
    reason: s.reason,
    sourceTailoredResumeId: tailoredResumeId,
    jobLabel,
    createdAt: now,
  }))
}

export function acceptSuggestion(
  data: ProfileData,
  suggestionId: string
): ProfileData {
  const pending = data.pendingSuggestions ?? []
  const suggestion = pending.find(s => s.id === suggestionId)
  if (!suggestion) return data

  let next = { ...data }

  if (suggestion.section === 'experience') {
    next = applyExperienceBullet(next, suggestion)
  } else if (suggestion.section === 'summary') {
    next = { ...next, summary: suggestion.proposedText }
  } else if (suggestion.section === 'projects') {
    next = applyProjectBullet(next, suggestion)
  }

  next.pendingSuggestions = pending.filter(s => s.id !== suggestionId)
  return next
}

function applyExperienceBullet(data: ProfileData, suggestion: PendingSuggestion): ProfileData {
  const experience = [...data.experience]
  let targetIdx = suggestion.targetEntryId
    ? experience.findIndex(e => e.id === suggestion.targetEntryId)
    : experience.length > 0 ? 0 : -1

  if (targetIdx < 0) {
    const newExp: ResumeExperience = {
      id: uid('exp'),
      company: '',
      title: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: [suggestion.proposedText],
      bulletIds: [uid('bul')],
      skills_used: [],
    }
    const bulletId = newExp.bulletIds![0]
    const provenance = seedTailorProvenance(data.provenance ?? {}, bulletId, suggestion)
    return { ...data, experience: [...experience, newExp], provenance }
  }

  const exp = { ...experience[targetIdx] }
  const bulletId = uid('bul')
  exp.bullets = [...exp.bullets, suggestion.proposedText]
  exp.bulletIds = [...(exp.bulletIds ?? syncIds(exp.bullets.slice(0, -1), exp.bulletIds)), bulletId]
  experience[targetIdx] = exp

  const provenance = seedTailorProvenance(data.provenance ?? {}, bulletId, suggestion)
  return { ...data, experience, provenance }
}

function applyProjectBullet(data: ProfileData, suggestion: PendingSuggestion): ProfileData {
  const projects = [...data.projects]
  const idx = suggestion.targetEntryId
    ? projects.findIndex(p => p.id === suggestion.targetEntryId)
    : projects.length > 0 ? 0 : -1
  if (idx < 0) return data

  const proj = { ...projects[idx] }
  const bulletId = uid('bul')
  proj.bullets = [...proj.bullets, suggestion.proposedText]
  proj.bulletIds = [...(proj.bulletIds ?? syncIds(proj.bullets.slice(0, -1), proj.bulletIds)), bulletId]
  projects[idx] = proj

  const provenance = seedTailorProvenance(data.provenance ?? {}, bulletId, suggestion)
  return { ...data, projects, provenance }
}

function syncIds(bullets: string[], ids?: string[]): string[] {
  return bulletsWithIds(bullets, ids).bulletIds
}

function seedTailorProvenance(
  provenance: Record<string, ProvenanceEntry>,
  bulletId: string,
  suggestion: PendingSuggestion
): Record<string, ProvenanceEntry> {
  const now = new Date().toISOString()
  return {
    ...provenance,
    [bulletId]: {
      origin: 'tailor',
      sourceTailoredResumeId: suggestion.sourceTailoredResumeId,
      jobLabel: suggestion.jobLabel,
      history: [
        {
          type: 'accepted',
          date: now,
          tailoredResumeId: suggestion.sourceTailoredResumeId,
          jobLabel: suggestion.jobLabel,
        },
        {
          type: 'added_from_tailor',
          date: now,
          tailoredResumeId: suggestion.sourceTailoredResumeId,
          jobLabel: suggestion.jobLabel,
        },
      ],
    },
  }
}

export function declineSuggestion(data: ProfileData, suggestionId: string): ProfileData {
  return {
    ...data,
    pendingSuggestions: (data.pendingSuggestions ?? []).filter(s => s.id !== suggestionId),
  }
}

/** Record a user edit on a bullet; heavy edits convert tailor tag to base (Q10) but keep history (Q10b). */
export function recordBulletEdit(
  data: ProfileData,
  bulletId: string,
  previousText: string,
  newText: string
): ProfileData {
  if (previousText.trim() === newText.trim()) return data

  const provenance = { ...(data.provenance ?? {}) }
  const existing = provenance[bulletId]
  const now = new Date().toISOString()
  const event = { type: 'edited' as const, date: now }

  if (!existing) {
    provenance[bulletId] = { origin: 'base', history: [event] }
    return { ...data, provenance }
  }

  const heavy = isHeavyEdit(previousText, newText)
  provenance[bulletId] = {
    ...existing,
    origin: heavy ? 'base' : existing.origin,
    history: [...existing.history, event],
  }
  return { ...data, provenance }
}

export function getProvenanceLabel(entry: ProvenanceEntry | undefined): string | null {
  if (!entry || entry.origin !== 'tailor') return null
  const added = entry.history.find(h => h.type === 'added_from_tailor' || h.type === 'accepted')
  if (added?.jobLabel) return `Added from tailor · ${added.jobLabel}`
  return 'Added from tailor'
}

export function formatProvenanceTimeline(entry: ProvenanceEntry): string[] {
  return entry.history.map(h => {
    const when = new Date(h.date).toLocaleDateString()
    if (h.type === 'added_from_tailor') return `${when}: Added from tailor${h.jobLabel ? ` (${h.jobLabel})` : ''}`
    if (h.type === 'accepted') return `${when}: Accepted into profile`
    return `${when}: Edited`
  })
}
