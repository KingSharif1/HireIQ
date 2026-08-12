import type { PendingSuggestion } from '@/types'

/** Fields collected on Accept when a proposal is too thin to commit as-is. */
export type SuggestionEnrichment = {
  entryKind: 'experience' | 'project'
  title: string
  company?: string
  startDate?: string
  endDate?: string
  current?: boolean
  url?: string
  github?: string
  technologies?: string[]
  /** At least one non-empty bullet required. */
  bullets: string[]
}

export function suggestionNeedsFollowUp(suggestion: PendingSuggestion): boolean {
  if (suggestion.section === 'summary' || suggestion.section === 'skills') {
    return false
  }

  if (suggestion.section === 'projects' && suggestion.newProject) {
    const nameOk = suggestion.newProject.name.trim().length > 0
    const bulletOk = suggestion.newProject.bullets.some(b => b.trim().length >= 10)
    return !(nameOk && bulletOk)
  }

  if (suggestion.section === 'projects' && suggestion.targetEntryId) {
    return false
  }

  if (suggestion.section === 'experience' && suggestion.targetEntryId) {
    return false
  }

  // New experience/project from Q&A (or thin project proposal) → follow-up sheet
  return (
    suggestion.section === 'experience' ||
    suggestion.section === 'projects'
  )
}

export function enrichmentDefaults(suggestion: PendingSuggestion): SuggestionEnrichment {
  if (suggestion.newProject) {
    return {
      entryKind: 'project',
      title: suggestion.newProject.name,
      github: suggestion.newProject.github,
      technologies: suggestion.newProject.technologies,
      bullets:
        suggestion.newProject.bullets.filter(b => b.trim()).length > 0
          ? suggestion.newProject.bullets
          : [suggestion.proposedText],
    }
  }

  return {
    entryKind: suggestion.section === 'projects' ? 'project' : 'experience',
    title: '',
    company: '',
    startDate: '',
    endDate: '',
    current: false,
    url: '',
    github: '',
    technologies: [],
    bullets: [suggestion.proposedText],
  }
}

export function validateEnrichment(enrichment: SuggestionEnrichment): string | null {
  if (!enrichment.title.trim()) {
    return enrichment.entryKind === 'project' ? 'Project name is required' : 'Title is required'
  }
  const bullets = enrichment.bullets.map(b => b.trim()).filter(Boolean)
  if (bullets.length === 0) {
    return 'Add at least one bullet'
  }
  return null
}
