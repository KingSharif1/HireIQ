import { classifyApplyEase } from '@/lib/apply/ease'
import { estimateApplyComplexity } from '@/lib/apply/types'

/**
 * Per-application credit pricing — Sprout-style difficulty ladder.
 *
 * 1 credit: public single-form ATS (Greenhouse / Lever / Ashby / Workable …).
 * 3 credits: account portals and multi-step flows (Workday, iCIMS, Taleo,
 * SuccessFactors, Oracle, sign-up/OTP/CAPTCHA pauses).
 *
 * Mirrors docs/PRICING.md ("1 vs 3 by portal complexity") and reuses the
 * existing `classifyApplyEase` signals so the UI can explain why.
 */

export const EASY_APPLY_CREDITS = 1
export const HARD_APPLY_CREDITS = 3

export interface ApplyCreditEstimate {
  credits: number
  /** Ease signals that drove the decision (host / kind / auth-wall …). */
  signals: string[]
}

export function creditCostForEase(ease: 'easy' | 'hard' | 'unknown'): number {
  return ease === 'hard' ? HARD_APPLY_CREDITS : EASY_APPLY_CREDITS
}

export function estimateApplyCredits(input: {
  url?: string | null
  html?: string | null
}): ApplyCreditEstimate {
  const url = input.url?.trim() || ''
  const credits = url ? estimateApplyComplexity(url) : EASY_APPLY_CREDITS
  const signals = classifyApplyEase(input).signals
  return { credits, signals }
}

/** Human copy for the apply CTA / confirm dialog. */
export function describeApplyCredits(credits: number): string {
  return credits === HARD_APPLY_CREDITS
    ? '3 credits — account portal or multi-step apply'
    : '1 credit — public apply form'
}
