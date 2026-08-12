import type { ResumeSkills } from '@/types'

export type DisplaySkill = {
  id: string
  label: string
}

export function canonicalSkillId(value: string): string {
  return value.trim().toLocaleLowerCase()
}

/** Preserve the first label while removing case-insensitive duplicates. */
export function uniqueSkillLabels(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const label = value.trim()
    const id = canonicalSkillId(label)
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(label)
  }

  return result
}

export function resumeSkillLabels(skills: Partial<ResumeSkills> | null | undefined): string[] {
  return uniqueSkillLabels([
    ...(skills?.technical ?? []),
    ...(skills?.tools ?? []),
    ...(skills?.languages ?? []),
  ])
}

export function displaySkills(
  skills: Partial<ResumeSkills> | null | undefined
): DisplaySkill[] {
  return resumeSkillLabels(skills).map(label => ({
    id: canonicalSkillId(label),
    label,
  }))
}
