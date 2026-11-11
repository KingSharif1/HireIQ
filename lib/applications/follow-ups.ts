import type { ApplicationStatus } from '@/types'

/**
 * Follow-up engine — the "keep track of every application" half of the tracker.
 *
 * Applied-but-silent applications become due for one polite nudge. Rules live
 * here (pure) so the cadence is testable, not buried in a query:
 *
 *  - only `applied` applications are followed up (nothing to chase before you
 *    submit, and interview/offer stages are handled by the user);
 *  - a reply from the employer cancels the follow-up;
 *  - an explicit `follow_up_at` always wins over the derived date;
 *  - otherwise the date is `applied_at + defaultDays`.
 */

export const DEFAULT_FOLLOW_UP_DAYS = 5
export const DEFAULT_UPCOMING_WINDOW_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

/** Statuses where chasing a reply makes no sense. */
export const CLOSED_STATUSES: readonly ApplicationStatus[] = [
  'interviewing',
  'negotiating',
  'offer',
  'rejected',
  'accepted',
]

export interface FollowUpCandidate {
  applicationId: string
  company: string
  title: string
  status: ApplicationStatus
  appliedAt: string | null
  followUpAt: string | null
  /** True when the employer has already replied (inbound email linked). */
  hasReply?: boolean
}

export type FollowUpSkipReason = 'not_submitted' | 'closed' | 'replied' | 'no_date' | 'later'

export interface FollowUpItem {
  candidate: FollowUpCandidate
  /** ISO timestamp the follow-up is due. */
  dueAt: string
  /** Negative when overdue. */
  daysUntilDue: number
}

export interface FollowUpPlan {
  due: FollowUpItem[]
  upcoming: FollowUpItem[]
  skipped: Array<{ candidate: FollowUpCandidate; reason: FollowUpSkipReason }>
}

export interface FollowUpOptions {
  now?: Date
  /** How far ahead counts as "upcoming". */
  upcomingDays?: number
  /** Days after applying before the first nudge when no explicit date is set. */
  defaultDays?: number
}

export function suggestFollowUpDate(appliedAt: string, days = DEFAULT_FOLLOW_UP_DAYS): string | null {
  const base = new Date(appliedAt)
  if (Number.isNaN(base.getTime())) return null
  return new Date(base.getTime() + days * DAY_MS).toISOString()
}

export function computeFollowUps(
  candidates: readonly FollowUpCandidate[],
  opts: FollowUpOptions = {},
): FollowUpPlan {
  const now = opts.now ?? new Date()
  const upcomingDays = opts.upcomingDays ?? DEFAULT_UPCOMING_WINDOW_DAYS
  const defaultDays = opts.defaultDays ?? DEFAULT_FOLLOW_UP_DAYS

  const due: FollowUpItem[] = []
  const upcoming: FollowUpItem[] = []
  const skipped: FollowUpPlan['skipped'] = []

  for (const candidate of candidates) {
    if (CLOSED_STATUSES.includes(candidate.status)) {
      skipped.push({ candidate, reason: 'closed' })
      continue
    }
    if (candidate.status !== 'applied') {
      skipped.push({ candidate, reason: 'not_submitted' })
      continue
    }
    if (candidate.hasReply) {
      skipped.push({ candidate, reason: 'replied' })
      continue
    }

    const dueAt = candidate.followUpAt?.trim()
      ? candidate.followUpAt
      : candidate.appliedAt
        ? suggestFollowUpDate(candidate.appliedAt, defaultDays)
        : null
    if (!dueAt) {
      skipped.push({ candidate, reason: 'no_date' })
      continue
    }

    const dueMs = new Date(dueAt).getTime()
    if (Number.isNaN(dueMs)) {
      skipped.push({ candidate, reason: 'no_date' })
      continue
    }

    const daysUntilDue = Math.ceil((dueMs - now.getTime()) / DAY_MS)
    const item: FollowUpItem = { candidate, dueAt, daysUntilDue }

    if (dueMs <= now.getTime()) due.push(item)
    else if (daysUntilDue <= upcomingDays) upcoming.push(item)
    else skipped.push({ candidate, reason: 'later' })
  }

  due.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  upcoming.sort((a, b) => a.dueAt.localeCompare(b.dueAt))

  return { due, upcoming, skipped }
}

/** Short suggested nudge — the user edits before sending. */
export function followUpDraft(item: FollowUpItem): string {
  const { company, title } = item.candidate
  const role = title ? ` for the ${title} role` : ''
  const days = Math.abs(item.daysUntilDue)
  const timing = days <= 1 ? 'last week' : `${days} days ago`
  return [
    `Hi ${company || 'there'} team,`,
    '',
    `I applied${role} ${timing} and wanted to reiterate my interest. I'm happy to share anything else that would help — please let me know if there's an update on timing.`,
    '',
    'Thanks!',
  ].join('\n')
}
