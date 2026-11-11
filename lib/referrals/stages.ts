import type { ReferralStage } from '@/types'

/**
 * Referral outreach state machine — pure transitions for the ask → referred →
 * replied funnel. Mirrors the apply-run status model (single source for the UI
 * and any worker).
 */

export const REFERRAL_STAGES: readonly ReferralStage[] = [
  'drafting',
  'intro_asked',
  'referred',
  'replied',
  'declined',
  'no_response',
]

export const TERMINAL_REFERRAL_STAGES: readonly ReferralStage[] = ['referred', 'declined']

/** Legal stage transitions. A reply can lead to a referral; no_response allows one follow-up. */
export const ALLOWED_REFERRAL_TRANSITIONS: Record<ReferralStage, readonly ReferralStage[]> = {
  drafting: ['intro_asked', 'declined'],
  intro_asked: ['referred', 'replied', 'declined', 'no_response'],
  replied: ['referred', 'declined'],
  no_response: ['intro_asked', 'declined'],
  referred: [],
  declined: [],
}

export function canTransitionReferral(from: ReferralStage, to: ReferralStage): boolean {
  return ALLOWED_REFERRAL_TRANSITIONS[from].includes(to)
}

export function isTerminalReferralStage(stage: ReferralStage): boolean {
  return TERMINAL_REFERRAL_STAGES.includes(stage)
}

/** Human label for the stage badge. */
export function referralStageLabel(stage: ReferralStage): string {
  switch (stage) {
    case 'drafting':
      return 'Drafting'
    case 'intro_asked':
      return 'Asked'
    case 'referred':
      return 'Referred'
    case 'replied':
      return 'Replied'
    case 'declined':
      return 'Declined'
    case 'no_response':
      return 'No response'
  }
}
