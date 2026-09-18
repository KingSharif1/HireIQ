import type {
  ProfileData,
  PendingSuggestion,
  ProvenanceEntry,
  ResumeExperience,
} from '@/types'
import { uid, emptyProfileData } from './data'
import { normalizeApplyAnswers } from './apply-answers'
import { bulletsWithIds, isHeavyEdit } from './bullets'
import { mergeDocumentVault } from './documents'
import type { WriteBackSuggestion } from '@/lib/ai/tailor-types'
import type { SuggestionEnrichment } from '@/lib/profile/suggestion-followup'
import { validateEnrichment } from '@/lib/profile/suggestion-followup'
import {
  filterNovelSuggestions,
  profileHasSuggestionContent,
  retargetSuggestionIfMismatch,
} from '@/lib/profile/suggestion-dedupe'

export function normalizeProfileData(data: ProfileData | null | undefined): ProfileData {
  const base = emptyProfileData()
  const raw = data ?? ({} as ProfileData)
  return {
    ...base,
    ...raw,
    personal: { ...base.personal, ...raw.personal },
    skills: { ...base.skills, ...raw.skills },
    applyAnswers: normalizeApplyAnswers(raw.applyAnswers),
    provenance: raw.provenance ?? {},
    pendingSuggestions: raw.pendingSuggestions ?? [],
    dismissedSuggestionIds: Array.isArray(raw.dismissedSuggestionIds)
      ? [...new Set(raw.dismissedSuggestionIds.filter(id => typeof id === 'string' && id))]
      : [],
    urls: Array.isArray(raw.urls) ? raw.urls : [],
    education: Array.isArray(raw.education) ? raw.education : [],
    certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    additionalDocuments: mergeDocumentVault(
      Array.isArray(raw.additionalDocuments) ? raw.additionalDocuments : [],
      Array.isArray(raw.attachments) ? raw.attachments : []
    ),
    attachments: [],
    experience: (Array.isArray(raw.experience) ? raw.experience : []).map(ensureExperienceBulletIds),
    projects: (Array.isArray(raw.projects) ? raw.projects : []).map(p => {
      const { bullets, bulletIds } = bulletsWithIds(p.bullets, p.bulletIds, 'pbul')
      return { ...p, bullets, bulletIds }
    }),
    volunteering: (Array.isArray(raw.volunteering) ? raw.volunteering : []).map(v => {
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
  incoming: PendingSuggestion[],
  options?: { preferIncoming?: boolean }
): PendingSuggestion[] {
  const byId = new Map(existing.map(s => [s.id, s]))
  for (const s of incoming) {
    if (!byId.has(s.id) || options?.preferIncoming) {
      byId.set(s.id, s)
    }
  }
  return [...byId.values()]
}

/** Merge then drop facts already on the profile (or duplicate pending text). */
export function mergeNovelPendingSuggestions(
  data: ProfileData,
  existing: PendingSuggestion[],
  incoming: PendingSuggestion[],
  options?: { preferIncoming?: boolean }
): PendingSuggestion[] {
  const merged = mergePendingSuggestions(existing, incoming, options)
  const withoutIncomingDupes = filterNovelSuggestions(
    { ...data, pendingSuggestions: existing },
    merged.filter(s => !existing.some(e => e.id === s.id))
  )
  const keptExisting = existing.filter(s => !profileHasSuggestionContent(data, s))
  return mergePendingSuggestions(keptExisting, withoutIncomingDupes, { preferIncoming: true })
}

/** Replace GitHub-sync pending items while keeping tailor/write-back suggestions. */
export function mergeGitHubPendingSuggestions(
  existing: PendingSuggestion[],
  incoming: PendingSuggestion[],
  data?: ProfileData
): PendingSuggestion[] {
  const kept = existing.filter(s => s.source !== 'github')
  const dismissed = new Set(data?.dismissedSuggestionIds ?? [])
  const allowed = incoming.filter(s => !dismissed.has(s.id))
  if (!data) {
    return mergePendingSuggestions(kept, allowed, { preferIncoming: true })
  }
  return mergeNovelPendingSuggestions(data, kept, allowed, { preferIncoming: true })
}

export function writeBackToPending(
  suggestions: WriteBackSuggestion[],
  tailoredResumeId: string,
  jobLabel: string,
  targetEntryId?: string,
  profile?: ProfileData
): PendingSuggestion[] {
  const now = new Date().toISOString()
  const mapped: PendingSuggestion[] = suggestions.map(s => ({
    id: s.id,
    section: s.section,
    targetEntryId: s.targetEntryId ?? targetEntryId,
    proposedText: s.proposedText,
    reason: s.reason,
    sourceTailoredResumeId: tailoredResumeId,
    jobLabel,
    createdAt: now,
    newExperience: s.newExperience,
    newProject: s.newProject,
  }))
  if (!profile) return mapped
  return filterNovelSuggestions(profile, mapped)
}

export function acceptSuggestion(
  data: ProfileData,
  suggestionId: string,
  enrichment?: SuggestionEnrichment
): ProfileData {
  const pending = data.pendingSuggestions ?? []
  const found = pending.find(s => s.id === suggestionId)
  if (!found) return data

  const suggestion = retargetSuggestionIfMismatch(data, found)

  // Already on the master — clear the card without appending a duplicate.
  if (!enrichment && profileHasSuggestionContent(data, suggestion)) {
    return {
      ...data,
      pendingSuggestions: pending.filter(s => s.id !== suggestionId),
    }
  }

  let next = { ...data }

  if (enrichment) {
    const err = validateEnrichment(enrichment)
    if (err) return data
    next = applyEnrichment(next, suggestion, enrichment)
  } else if (suggestion.section === 'experience') {
    next = applyExperienceBullet(next, suggestion)
  } else if (suggestion.section === 'summary') {
    next = { ...next, summary: suggestion.proposedText }
  } else if (suggestion.section === 'skills') {
    const technical = [...next.skills.technical]
    const text = suggestion.proposedText.trim()
    if (text && !technical.some(t => t.toLowerCase() === text.toLowerCase())) {
      technical.push(text)
    }
    next = { ...next, skills: { ...next.skills, technical } }
  } else if (suggestion.section === 'projects') {
    if (suggestion.newProject) {
      next = applyNewProject(next, suggestion)
    } else if (isGitHubToolSuggestion(suggestion)) {
      next = applyProjectTechnology(next, suggestion)
    } else {
      next = applyProjectBullet(next, suggestion)
    }
  }

  next.pendingSuggestions = pending.filter(s => s.id !== suggestionId)
  return next
}

function applyEnrichment(
  data: ProfileData,
  suggestion: PendingSuggestion,
  enrichment: SuggestionEnrichment
): ProfileData {
  const bullets = enrichment.bullets.map(b => b.trim()).filter(Boolean)
  const { bullets: normalized, bulletIds } = bulletsWithIds(bullets, undefined, 'bul')
  const provenance = seedBulletsProvenance(data.provenance ?? {}, bulletIds, suggestion)

  if (enrichment.entryKind === 'project') {
    const project = {
      id: uid('proj'),
      name: enrichment.title.trim(),
      description: suggestion.newProject?.description ?? '',
      bullets: normalized,
      bulletIds,
      technologies: enrichment.technologies ?? suggestion.newProject?.technologies ?? [],
      url: enrichment.url?.trim() ?? '',
      github: enrichment.github?.trim() || suggestion.newProject?.github || '',
      source: suggestion.source === 'github' ? ('github' as const) : ('manual' as const),
    }
    return {
      ...data,
      projects: [project, ...data.projects],
      provenance,
    }
  }

  const newExp: ResumeExperience = {
    id: uid('exp'),
    company: enrichment.company?.trim() ?? '',
    title: enrichment.title.trim(),
    location: '',
    startDate: enrichment.startDate?.trim() ?? '',
    endDate: enrichment.endDate?.trim() ?? '',
    current: Boolean(enrichment.current),
    bullets: normalized,
    bulletIds,
    skills_used: [],
  }
  return {
    ...data,
    experience: [newExp, ...data.experience],
    provenance,
  }
}

function seedBulletsProvenance(
  provenance: Record<string, ProvenanceEntry>,
  bulletIds: string[],
  suggestion: PendingSuggestion
): Record<string, ProvenanceEntry> {
  let next = provenance
  for (const bulletId of bulletIds) {
    next = seedTailorProvenance(next, bulletId, suggestion)
  }
  return next
}

function applyExperienceBullet(data: ProfileData, suggestion: PendingSuggestion): ProfileData {
  const experience = [...data.experience]
  const targetIdx = suggestion.targetEntryId
    ? experience.findIndex(e => e.id === suggestion.targetEntryId)
    : -1

  if (targetIdx < 0) {
    const newExp: ResumeExperience = {
      id: uid('exp'),
      company: suggestion.newExperience?.company ?? '',
      title: suggestion.newExperience?.title ?? '',
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
    return { ...data, experience: [newExp, ...experience], provenance }
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
    : -1
  if (idx < 0) return data

  const proj = { ...projects[idx] }
  const bulletId = uid('bul')
  proj.bullets = [...proj.bullets, suggestion.proposedText]
  proj.bulletIds = [...(proj.bulletIds ?? syncIds(proj.bullets.slice(0, -1), proj.bulletIds)), bulletId]
  projects[idx] = proj

  const provenance = seedTailorProvenance(data.provenance ?? {}, bulletId, suggestion)
  return { ...data, projects, provenance }
}

function applyProjectTechnology(data: ProfileData, suggestion: PendingSuggestion): ProfileData {
  const projects = [...data.projects]
  const idx = suggestion.targetEntryId
    ? projects.findIndex(p => p.id === suggestion.targetEntryId)
    : -1
  if (idx < 0) return data

  const tech = suggestion.proposedText.trim()
  if (!tech) return data
  const proj = { ...projects[idx] }
  if (proj.technologies.some(t => t.toLowerCase() === tech.toLowerCase())) return data
  proj.technologies = [...proj.technologies, tech]
  projects[idx] = proj
  return { ...data, projects }
}

function applyNewProject(data: ProfileData, suggestion: PendingSuggestion): ProfileData {
  const np = suggestion.newProject
  if (!np) return data

  const { bullets, bulletIds } = bulletsWithIds(np.bullets, undefined, 'pbul')
  const project = {
    id: uid('proj'),
    name: np.name,
    description: np.description,
    bullets,
    bulletIds,
    technologies: np.technologies,
    url: '',
    github: np.github,
    source: suggestion.source === 'github' ? ('github' as const) : ('manual' as const),
  }

  const provenance = { ...(data.provenance ?? {}) }
  const now = new Date().toISOString()
  const origin = suggestion.source === 'github' ? 'github' : 'tailor'
  for (const bulletId of bulletIds) {
    provenance[bulletId] = {
      origin,
      sourceTailoredResumeId: suggestion.sourceTailoredResumeId,
      jobLabel: suggestion.jobLabel,
      history: [
        { type: 'accepted', date: now, tailoredResumeId: suggestion.sourceTailoredResumeId, jobLabel: suggestion.jobLabel },
        { type: 'added_from_tailor', date: now, tailoredResumeId: suggestion.sourceTailoredResumeId, jobLabel: suggestion.jobLabel },
      ],
    }
  }

  return {
    ...data,
    projects: [project, ...data.projects],
    provenance,
  }
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
  const origin = suggestion.source === 'github' ? 'github' : 'tailor'
  return {
    ...provenance,
    [bulletId]: {
      origin,
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
  const dismissed = new Set(data.dismissedSuggestionIds ?? [])
  dismissed.add(suggestionId)
  return {
    ...data,
    pendingSuggestions: (data.pendingSuggestions ?? []).filter(s => s.id !== suggestionId),
    dismissedSuggestionIds: [...dismissed],
  }
}

/** GitHub tool-tag suggestions use ids like `gh-42-tool-next-js`. */
export function isGitHubToolSuggestion(suggestion: PendingSuggestion): boolean {
  return suggestion.source === 'github' && /^gh-\d+-tool-/.test(suggestion.id)
}

/** Add an evidence-backed GitHub highlight while preserving its repository origin. */
export function addGitHubProjectHighlight(
  data: ProfileData,
  projectId: string,
  text: string,
  sourceLabel: string,
  technologies: string[] = []
): ProfileData {
  const normalized = normalizeProfileData(data)
  const project = normalized.projects.find(item => item.id === projectId)
  const bullet = text.trim()
  if (!project || !bullet || project.bullets.some(item => item.trim() === bullet)) return normalized

  const bulletId = uid('pbul')
  const now = new Date().toISOString()
  return {
    ...normalized,
    projects: normalized.projects.map(item =>
      item.id === projectId
        ? {
            ...item,
            bullets: [...item.bullets, bullet],
            bulletIds: [...(item.bulletIds ?? []), bulletId],
            technologies: [
              ...item.technologies,
              ...technologies.filter(
                technology =>
                  !item.technologies.some(
                    current => current.toLowerCase() === technology.toLowerCase()
                  )
              ),
            ],
          }
        : item
    ),
    provenance: {
      ...(normalized.provenance ?? {}),
      [bulletId]: {
        origin: 'github',
        jobLabel: sourceLabel,
        history: [{ type: 'accepted', date: now, jobLabel: sourceLabel }],
      },
    },
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
  if (!entry) return null
  if (entry.origin === 'github') {
    return entry.jobLabel ? `From GitHub · ${entry.jobLabel}` : 'From GitHub'
  }
  if (entry.origin === 'tailor') {
    const added = entry.history.find(h => h.type === 'added_from_tailor' || h.type === 'accepted')
    if (added?.jobLabel) return `From AI · ${added.jobLabel}`
    if (entry.jobLabel) return `From AI · ${entry.jobLabel}`
    return 'From AI · gap answer'
  }
  const edited = [...entry.history].reverse().find(h => h.type === 'edited')
  if (edited) {
    const when = new Date(edited.date).toLocaleDateString()
    return `You · edited ${when}`
  }
  return null
}

/** First tailor/GitHub/you source label across bullet ids (for entry cards). */
export function entrySourceLabel(
  provenance: Record<string, ProvenanceEntry> | undefined,
  bulletIds: string[] | undefined,
  bullets?: string[]
): string | null {
  if (!provenance || !bulletIds?.length) return null
  for (let i = 0; i < bulletIds.length; i++) {
    if (bullets && !bullets[i]?.trim()) continue
    const label = getProvenanceLabel(provenance[bulletIds[i]])
    if (label) return label
  }
  return null
}

export function formatProvenanceTimeline(entry: ProvenanceEntry): string[] {
  return entry.history.map(h => {
    const when = new Date(h.date).toLocaleDateString()
    if (h.type === 'added_from_tailor') {
      const who = entry.origin === 'github' ? 'GitHub' : 'AI'
      return `${when}: Added from ${who}${h.jobLabel ? ` (${h.jobLabel})` : ''}`
    }
    if (h.type === 'accepted') return `${when}: You accepted into profile`
    return `${when}: You edited`
  })
}
