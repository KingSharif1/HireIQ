/** Tiered model IDs (Q14). Keep all Anthropic model strings here — routes import from this file. */
export const AI_MODELS = {
  /** Main generate + final critique */
  strong: 'claude-sonnet-4-6',
  /** Loop critique passes (cheap / fast) */
  fast: 'claude-haiku-4-5-20251001',
} as const

/** Hard cap on tailor loop retries (Q5). */
export const TAILOR_MAX_RETRIES = 2

/** Language overlap gate threshold (Q5). */
export const TAILOR_OVERLAP_GATE = 70

/** Max AI calls per tailor run (cost guard). */
export const TAILOR_MAX_AI_CALLS = 8
