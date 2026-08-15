/**
 * Anthropic model catalog + published $/MTok rates (platform.claude.com, Aug 2026).
 * Estimates only — Anthropic's invoice is source of truth.
 */

export const AI_MODELS = {
  /** Main generate (one call, no retry) */
  strong: 'claude-sonnet-4-6',
  /** Cheap / fast — autofill drafts only. Never used to "fix" a failed tailor. */
  fast: 'claude-haiku-4-5-20251001',
} as const

export type AiModelId = string

export type AiFeature =
  | 'job_analyze'
  | 'resume_parse'
  | 'gap_questions'
  | 'tailor_resume'
  | 'cover_letter'
  | 'autofill_draft'
  | 'auto_apply'

export const AI_FEATURES: {
  id: AiFeature
  label: string
  uses: 'strong' | 'fast' | 'strong+fast' | 'infra'
  where: string
}[] = [
  { id: 'job_analyze', label: 'Analyze job posting', uses: 'strong', where: 'Save / paste a job' },
  { id: 'resume_parse', label: 'Parse uploaded resume', uses: 'strong', where: 'Resume upload' },
  { id: 'gap_questions', label: 'Gap questions', uses: 'strong', where: 'Tailor Q&A' },
  { id: 'tailor_resume', label: 'Tailor resume', uses: 'strong', where: 'Job documents / tailor' },
  { id: 'cover_letter', label: 'Cover letter', uses: 'strong', where: 'Job → Cover letter' },
  { id: 'autofill_draft', label: 'Application question drafts', uses: 'fast', where: 'Chrome extension' },
  { id: 'auto_apply', label: 'Auto-apply with HireIQ', uses: 'infra', where: 'Job → Auto-apply' },
]

/** Cloud Run fill estimate from CLOUD-RUN-APPLY.md (~$0.005 per ~90s run before free tier). */
export const AUTO_APPLY_USD_PER_COMPLEXITY_UNIT = 0.005

export const AI_MODEL_CATALOG: {
  id: string
  label: string
  tier: 'fast' | 'strong' | 'premium'
  inputUsdPerMTok: number
  outputUsdPerMTok: number
}[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Haiku 4.5',
    tier: 'fast',
    inputUsdPerMTok: 1,
    outputUsdPerMTok: 5,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Sonnet 4.6',
    tier: 'strong',
    inputUsdPerMTok: 3,
    outputUsdPerMTok: 15,
  },
  {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5',
    tier: 'strong',
    inputUsdPerMTok: 2,
    outputUsdPerMTok: 10,
  },
  {
    id: 'claude-opus-4-6',
    label: 'Opus 4.6',
    tier: 'premium',
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 25,
  },
  {
    id: 'claude-opus-5',
    label: 'Opus 5',
    tier: 'premium',
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 25,
  },
]

const PRICE_BY_PREFIX: { prefix: string; input: number; output: number }[] = [
  { prefix: 'claude-haiku-4-5', input: 1, output: 5 },
  { prefix: 'claude-haiku', input: 1, output: 5 },
  { prefix: 'claude-sonnet-5', input: 2, output: 10 },
  { prefix: 'claude-sonnet-4', input: 3, output: 15 },
  { prefix: 'claude-sonnet', input: 3, output: 15 },
  { prefix: 'claude-opus', input: 5, output: 25 },
]

export function isAllowedAiModel(id: string): boolean {
  return AI_MODEL_CATALOG.some(m => m.id === id)
}

export function modelLabel(id: string): string {
  return AI_MODEL_CATALOG.find(m => m.id === id)?.label ?? id
}

export function estimateTokenCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const listed = AI_MODEL_CATALOG.find(m => m.id === modelId)
  let input = listed?.inputUsdPerMTok
  let output = listed?.outputUsdPerMTok
  if (input == null || output == null) {
    const hit = PRICE_BY_PREFIX.find(p => modelId.startsWith(p.prefix))
    input = hit?.input ?? 3
    output = hit?.output ?? 15
  }
  const usd = (inputTokens / 1_000_000) * input + (outputTokens / 1_000_000) * output
  return roundUsd(usd)
}

export function roundUsd(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '$0'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs < 0.01) return `${sign}$${abs.toFixed(4)}`
  if (abs < 1) return `${sign}$${abs.toFixed(3)}`
  return `${sign}$${abs.toFixed(2)}`
}

/** Typical tokens for one user click (not one inner Claude call). */
export const TYPICAL_ACTION_TOKENS: Record<
  Exclude<AiFeature, 'auto_apply'>,
  { strongIn: number; strongOut: number; fastIn: number; fastOut: number }
> = {
  job_analyze: { strongIn: 1400, strongOut: 800, fastIn: 0, fastOut: 0 },
  resume_parse: { strongIn: 1600, strongOut: 2200, fastIn: 0, fastOut: 0 },
  gap_questions: { strongIn: 2500, strongOut: 900, fastIn: 0, fastOut: 0 },
  tailor_resume: { strongIn: 22000, strongOut: 4800, fastIn: 0, fastOut: 0 },
  cover_letter: { strongIn: 2300, strongOut: 700, fastIn: 0, fastOut: 0 },
  autofill_draft: { strongIn: 0, strongOut: 0, fastIn: 2800, fastOut: 900 },
}

export function typicalActionCostUsd(
  feature: AiFeature,
  models: { strong: string; fast: string } = AI_MODELS,
): number {
  if (feature === 'auto_apply') return AUTO_APPLY_USD_PER_COMPLEXITY_UNIT
  const t = TYPICAL_ACTION_TOKENS[feature]
  return roundUsd(
    estimateTokenCostUsd(models.strong, t.strongIn, t.strongOut) +
      estimateTokenCostUsd(models.fast, t.fastIn, t.fastOut),
  )
}

export function charsToTokens(chars: number): number {
  return Math.max(0, Math.ceil(chars / 4))
}

/**
 * Vercel AI SDK `generateText` / `streamText` default is 2 retries (3 paid calls).
 * We never retry a failed paid call — fail once, stop.
 */
export const AI_SDK_MAX_RETRIES = 0

/** Hard cap: never retry / loop paid tailor calls. One draft, then stop. */
export const TAILOR_MAX_RETRIES = 0

/** Language overlap gate threshold (Q5). */
export const TAILOR_OVERLAP_GATE = 70

/** Max AI calls per tailor generate phase (cost guard). One markdown rewrite + one retry. No critique loop. */
export const TAILOR_MAX_AI_CALLS = 2
