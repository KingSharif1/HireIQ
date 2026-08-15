export type ExtractionMethod =
  | 'ats-api'
  | 'host-rule'
  | 'json-ld'
  | 'open-graph'
  | 'hydration-json'
  | 'html-heuristic'
  | 'playwright'

export type ExtractionConfidence = 'high' | 'medium' | 'low'

export type ExtractionResult = {
  text: string
  title: string
  company: string
  method: ExtractionMethod
  confidence: ExtractionConfidence
  /** Which fetch rule produced this result, when applicable. */
  ruleId?: string
}

export type FetchAttempt = {
  method: ExtractionMethod
  ruleId?: string
  success: boolean
  textLength: number
  durationMs: number
  error?: string
}

export type HtmlExtractionOutcome = {
  result: ExtractionResult | null
  attempts: FetchAttempt[]
  pageHtml?: string
}

/** Minimum chars to consider an extraction usable without Playwright fallback. */
export const MIN_USABLE_DESCRIPTION_CHARS = 100

/** Playwright runs only when fast methods stay below this threshold. */
export const PLAYWRIGHT_FALLBACK_THRESHOLD = 200
