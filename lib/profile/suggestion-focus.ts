import type { PendingSuggestion, ProfileData } from '@/types'

export interface AcceptedSuggestionFocus {
  section: PendingSuggestion['section']
  entryId?: string
  bulletId?: string
}

function bulletIdsFor(
  data: ProfileData,
  section: PendingSuggestion['section'],
  entryId: string
): string[] {
  if (section === 'experience') {
    return data.experience.find(entry => entry.id === entryId)?.bulletIds ?? []
  }
  if (section === 'projects') {
    return data.projects.find(entry => entry.id === entryId)?.bulletIds ?? []
  }
  return []
}

/** Locate the exact entry/bullet created by accepting a master suggestion. */
export function acceptedSuggestionFocus(
  before: ProfileData,
  after: ProfileData,
  suggestion: PendingSuggestion
): AcceptedSuggestionFocus {
  if (suggestion.section !== 'experience' && suggestion.section !== 'projects') {
    return { section: suggestion.section }
  }

  const beforeEntries =
    suggestion.section === 'experience' ? before.experience : before.projects
  const afterEntries =
    suggestion.section === 'experience' ? after.experience : after.projects
  const entryId =
    suggestion.targetEntryId ??
    afterEntries.find(entry => !beforeEntries.some(previous => previous.id === entry.id))?.id

  if (!entryId) return { section: suggestion.section }

  const previousIds = new Set(bulletIdsFor(before, suggestion.section, entryId))
  const bulletId = bulletIdsFor(after, suggestion.section, entryId).find(id => !previousIds.has(id))

  return { section: suggestion.section, entryId, bulletId }
}
