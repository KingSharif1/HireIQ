/**
 * Shared AI-tell diction list — single source of truth for both the tailor
 * prompt (never generate these) and the pre-export check (warn if they slip
 * through). Keep the two in sync by importing this module; do not duplicate
 * the list in prompt strings.
 */
export const AI_TELL_WORDS = [
  'leveraged',
  'leverage',
  'utilize',
  'utilized',
  'spearheaded',
  'synergy',
  'synergies',
  'passionate',
  'dynamic',
  'cutting-edge',
  'delve',
  'tapestry',
  'game-changer',
  'game changer',
  'results-driven',
  'thought leader',
  "in today's fast-paced",
  'in todays fast-paced',
] as const

/** Case-insensitive whole-word/phrase match. Returns the distinct tells found. */
export function findAiTells(text: string): string[] {
  const found: string[] = []
  for (const word of AI_TELL_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) found.push(word)
  }
  return found
}

/** Em-dashes are the single most common AI tell in generated resumes. */
export function countEmDashes(text: string): number {
  return (text.match(/—/g) ?? []).length
}

/** Joined list for prompt interpolation. */
export function aiTellWordsForPrompt(): string {
  return [...AI_TELL_WORDS].join('", "')
}
