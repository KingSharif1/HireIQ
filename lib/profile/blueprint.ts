import type { ProfileData, ResumeBlueprint, ResumeRule } from '@/types'

/** Section keys a blueprint can carry rules / order for. */
export const BLUEPRINT_SECTION_KEYS = [
  'title',
  'summary',
  'experience',
  'projects',
  'education',
  'skills',
  'certifications',
  'volunteer',
  'awards',
] as const

export type BlueprintSectionKey = (typeof BLUEPRINT_SECTION_KEYS)[number]

export const RESUME_RULES: { value: ResumeRule; label: string; description: string }[] = [
  { value: 'auto', label: 'AI decides', description: 'In when relevant, may reword' },
  { value: 'tailored', label: 'Always · tailored', description: 'Always in, AI may reword' },
  { value: 'verbatim', label: 'Always · as written', description: 'Always in, untouched' },
]

/** Normalize a possibly-partial blueprint into a complete shape. */
export function normalizeBlueprint(bp: ResumeBlueprint | null | undefined): ResumeBlueprint {
  return {
    aiChooses: bp?.aiChooses ?? true,
    rules: bp?.rules ?? {},
    hidden: Array.isArray(bp?.hidden) ? bp.hidden : [],
    order: bp?.order ?? {},
  }
}

export function defaultBlueprint(): ResumeBlueprint {
  return normalizeBlueprint(null)
}

/** Merge stored blueprint over defaults; tolerate partial/missing values. */
export function resolveBlueprint(data: ProfileData | null | undefined): ResumeBlueprint {
  return normalizeBlueprint(data?.blueprint)
}

/** Direct rule for an id; 'auto' when unset. */
export function ruleFor(blueprint: ResumeBlueprint, id: string): ResumeRule {
  return blueprint.rules[id] ?? 'auto'
}

export function isHidden(blueprint: ResumeBlueprint, id: string): boolean {
  return blueprint.hidden.includes(id)
}

/** Ordered ids for a section, falling back to the caller's natural order. */
export function orderedIds(blueprint: ResumeBlueprint, sectionKey: string): string[] {
  return blueprint.order[sectionKey] ?? []
}

/** Stable, unique id for a bullet — the same id enforcement and the UI key rules by. */
export function bulletIdFor(
  entry: { id?: string; bulletIds?: string[] },
  index: number,
): string {
  return entry.bulletIds?.[index] ?? `${entry.id ?? 'entry'}:${index}`
}
