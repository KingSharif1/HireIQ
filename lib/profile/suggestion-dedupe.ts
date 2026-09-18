import type { PendingSuggestion, ProfileData, ResumeExperience, ResumeProject } from '@/types'
import { textSimilarity } from '@/lib/profile/bullets'
import { nameMentioned, normalizeMatchKey } from '@/lib/profile/route-gap-answer'

/** Near-duplicate threshold for resume facts (bullets / skills). */
export const FACT_SIMILARITY_THRESHOLD = 0.88

export function normalizeFactText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[•*_`"']/g, '')
    .replace(/\s+/g, ' ')
}

export function factsEquivalent(a: string, b: string): boolean {
  const na = normalizeFactText(a)
  const nb = normalizeFactText(b)
  if (!na || !nb) return false
  if (na === nb) return true
  return textSimilarity(na, nb) >= FACT_SIMILARITY_THRESHOLD
}

function bulletsInclude(bullets: string[] | undefined, text: string): boolean {
  return (bullets ?? []).some(b => factsEquivalent(b, text))
}

function skillExists(data: ProfileData, text: string): boolean {
  const pools = [
    ...data.skills.technical,
    ...data.skills.tools,
    ...data.skills.languages,
    ...data.skills.soft,
  ]
  return pools.some(s => factsEquivalent(s, text))
}

function findExperienceByMention(
  experience: ResumeExperience[],
  text: string
): ResumeExperience | undefined {
  const hits = experience.filter(
    e =>
      (e.company.trim() && nameMentioned(text, e.company)) ||
      (e.title.trim() && nameMentioned(text, e.title))
  )
  if (hits.length === 1) return hits[0]
  if (hits.length > 1) {
    // Prefer the longest company match so "Harper" wins over a short false positive.
    return [...hits].sort(
      (a, b) => normalizeMatchKey(b.company).length - normalizeMatchKey(a.company).length
    )[0]
  }
  return undefined
}

function findProjectByMention(projects: ResumeProject[], text: string): ResumeProject | undefined {
  const hits = projects.filter(p => p.name.trim() && nameMentioned(text, p.name))
  if (hits.length === 1) return hits[0]
  if (hits.length > 1) {
    return [...hits].sort(
      (a, b) => normalizeMatchKey(b.name).length - normalizeMatchKey(a.name).length
    )[0]
  }
  return undefined
}

/**
 * True when the proposed fact is already on the profile (same bullet/skill/summary).
 * Used before offering or accepting so we don't re-add Harper-style repeats.
 */
export function profileHasSuggestionContent(
  data: ProfileData,
  suggestion: PendingSuggestion
): boolean {
  const text = suggestion.proposedText.trim()
  if (!text) return true

  if (suggestion.section === 'skills') {
    return skillExists(data, text)
  }

  if (suggestion.section === 'summary') {
    return factsEquivalent(data.summary, text)
  }

  if (suggestion.section === 'projects') {
    if (suggestion.newProject) {
      const name = suggestion.newProject.name
      const existing = data.projects.find(
        p => normalizeMatchKey(p.name) === normalizeMatchKey(name)
      )
      if (!existing) return false
      const bullets = suggestion.newProject.bullets?.length
        ? suggestion.newProject.bullets
        : [text]
      return bullets.every(b => !b.trim() || bulletsInclude(existing.bullets, b))
    }
    const target = suggestion.targetEntryId
      ? data.projects.find(p => p.id === suggestion.targetEntryId)
      : undefined
    if (target) return bulletsInclude(target.bullets, text)
    return data.projects.some(p => bulletsInclude(p.bullets, text))
  }

  // experience
  if (suggestion.newExperience && !suggestion.targetEntryId) {
    const company = suggestion.newExperience.company
    const existing = data.experience.find(
      e =>
        normalizeMatchKey(e.company) === normalizeMatchKey(company) &&
        (!suggestion.newExperience?.title ||
          normalizeMatchKey(e.title) === normalizeMatchKey(suggestion.newExperience.title))
    )
    if (!existing) return false
    return bulletsInclude(existing.bullets, text)
  }

  const target = suggestion.targetEntryId
    ? data.experience.find(e => e.id === suggestion.targetEntryId)
    : undefined
  if (target) return bulletsInclude(target.bullets, text)
  return data.experience.some(e => bulletsInclude(e.bullets, text))
}

/**
 * If proposed text clearly belongs to another existing role/project than targetEntryId,
 * retarget (Harper text must not land on the wrong job).
 */
export function retargetSuggestionIfMismatch(
  data: ProfileData,
  suggestion: PendingSuggestion
): PendingSuggestion {
  const text = suggestion.proposedText
  if (!text.trim()) return suggestion

  if (suggestion.section === 'experience' && !suggestion.newExperience) {
    const mentioned = findExperienceByMention(data.experience, text)
    if (!mentioned) return suggestion
    if (suggestion.targetEntryId && suggestion.targetEntryId !== mentioned.id) {
      return { ...suggestion, targetEntryId: mentioned.id }
    }
    if (!suggestion.targetEntryId) {
      return { ...suggestion, targetEntryId: mentioned.id }
    }
  }

  if (suggestion.section === 'projects' && !suggestion.newProject) {
    const mentioned = findProjectByMention(data.projects, text)
    if (!mentioned) return suggestion
    if (suggestion.targetEntryId && suggestion.targetEntryId !== mentioned.id) {
      return { ...suggestion, targetEntryId: mentioned.id }
    }
    if (!suggestion.targetEntryId) {
      return { ...suggestion, targetEntryId: mentioned.id }
    }
  }

  return suggestion
}

/** Drop suggestions whose content is already on the profile; also drop pending near-dupes. */
export function filterNovelSuggestions(
  data: ProfileData,
  incoming: PendingSuggestion[]
): PendingSuggestion[] {
  const kept: PendingSuggestion[] = []
  const pendingTexts = (data.pendingSuggestions ?? [])
    .map(s => normalizeFactText(s.proposedText))
    .filter(Boolean)

  for (const raw of incoming) {
    const suggestion = retargetSuggestionIfMismatch(data, raw)
    if (profileHasSuggestionContent(data, suggestion)) continue
    const key = normalizeFactText(suggestion.proposedText)
    if (!key) continue
    if (pendingTexts.some(p => factsEquivalent(p, key))) continue
    if (kept.some(k => factsEquivalent(k.proposedText, suggestion.proposedText))) continue
    kept.push(suggestion)
    pendingTexts.push(key)
  }
  return kept
}
