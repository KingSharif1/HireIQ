import {
  canTransitionReferral,
  isTerminalReferralStage,
  referralStageLabel,
  REFERRAL_STAGES,
} from '@/lib/referrals/stages'
import type { ReferralStage } from '@/types'

/**
 * Referral outreach funnel — persisting and moving a warm intro through
 * `drafting → intro_asked → referred | replied | declined | no_response`.
 *
 * Everything here is pure so the transition rules and the counters are testable;
 * the API route only does I/O. Messages are drafts — HireIQ never sends them.
 */

export interface OutreachInput {
  connectionId: string
  stage?: ReferralStage
  messageDraft?: string | null
  jobId?: string | null
  applicationId?: string | null
  referralStrength?: number | null
}

export interface OutreachRow {
  id: string
  connection_id: string | null
  job_id: string | null
  application_id: string | null
  stage: ReferralStage
  message_draft: string | null
  referral_strength: number | null
  asked_at: string | null
  replied_at: string | null
  created_at: string
  updated_at: string
}

export interface OutreachSummary {
  total: number
  byStage: Record<ReferralStage, number>
  /** Outreach that has actually been asked (not still a draft). */
  asked: number
  referred: number
  replied: number
  /** referred / asked, 0 when nothing has been asked yet. */
  conversion: number
}

export function defaultOutreachStage(): ReferralStage {
  return 'drafting'
}

/**
 * Timestamps implied by entering a stage: asking records asked_at, any reply-side
 * stage records replied_at. Returns only the fields that should be written.
 */
export function stageTimestamps(
  stage: ReferralStage,
  now: Date = new Date(),
): { asked_at?: string; replied_at?: string } {
  const iso = now.toISOString()
  switch (stage) {
    case 'intro_asked':
      return { asked_at: iso }
    case 'replied':
    case 'referred':
    case 'declined':
    case 'no_response':
      return { replied_at: iso }
    case 'drafting':
    default:
      return {}
  }
}

export interface TransitionCheck {
  ok: boolean
  error?: string
}

export function checkOutreachTransition(from: ReferralStage, to: ReferralStage): TransitionCheck {
  if (from === to) return { ok: false, error: `Already ${referralStageLabel(from)}` }
  if (isTerminalReferralStage(from)) {
    return { ok: false, error: `${referralStageLabel(from)} is final — start a new ask instead.` }
  }
  if (!canTransitionReferral(from, to)) {
    return { ok: false, error: `Cannot move from ${referralStageLabel(from)} to ${referralStageLabel(to)}` }
  }
  return { ok: true }
}

export function summariseOutreach(rows: readonly Pick<OutreachRow, 'stage'>[]): OutreachSummary {
  const byStage = Object.fromEntries(REFERRAL_STAGES.map((stage) => [stage, 0])) as Record<
    ReferralStage,
    number
  >
  for (const row of rows) {
    if (byStage[row.stage] !== undefined) byStage[row.stage] += 1
  }
  const asked = rows.filter((row) => row.stage !== 'drafting').length
  const referred = byStage.referred ?? 0
  const replied = byStage.replied ?? 0
  return {
    total: rows.length,
    byStage,
    asked,
    referred,
    replied,
    conversion: asked > 0 ? referred / asked : 0,
  }
}

/** Rows that deserve attention: asked but silent for `staleDays`. */
export function staleOutreach(
  rows: readonly OutreachRow[],
  opts: { now?: Date; staleDays?: number } = {},
): OutreachRow[] {
  const now = opts.now ?? new Date()
  const staleDays = opts.staleDays ?? 7
  const cutoff = now.getTime() - staleDays * 24 * 60 * 60 * 1000
  return rows.filter((row) => {
    if (row.stage !== 'intro_asked') return false
    const asked = row.asked_at ? new Date(row.asked_at).getTime() : new Date(row.created_at).getTime()
    return Number.isFinite(asked) && asked <= cutoff
  })
}
