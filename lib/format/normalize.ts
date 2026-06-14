import type { StructuredResume } from '@/types'

/**
 * Title-case a person's name regardless of how it was stored
 * ("SHARIF AHMED" / "sharif ahmed" -> "Sharif Ahmed"). Handles hyphens,
 * apostrophes, and common Mc/Mac prefixes. Deterministic, no AI.
 */
export function toTitleCaseName(raw: string | undefined | null): string {
  if (!raw) return raw ?? ''
  return raw
    .trim()
    .toLowerCase()
    // Capitalize the first letter of every word part (after space, hyphen, apostrophe).
    .replace(/(^|[\s'-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    // Fix the common "Mc" prefix (Mcdonald -> McDonald).
    .replace(/\bMc([a-z])/g, (_, ch: string) => 'Mc' + ch.toUpperCase())
}

/**
 * Returns a copy of the resume with deterministic display fixes applied.
 * Currently: title-cases the contact name. Kept intentionally narrow so we
 * never silently rewrite the user's real wording.
 */
export function normalizeResumeForDisplay(data: StructuredResume): StructuredResume {
  if (!data?.contact?.name) return data
  const fixedName = toTitleCaseName(data.contact.name)
  if (fixedName === data.contact.name) return data
  return {
    ...data,
    contact: { ...data.contact, name: fixedName },
  }
}
