import type { ApplicationStatus } from '@/types'

/**
 * Job-hunt pulse (issue #30) — the numbers that sit on top of the tracker:
 * weekday apply cadence, email watch, and a plain-English next step per job.
 * Pure so the rules are testable and the page stays a thin data loader.
 */

export const DEFAULT_CADENCE = { weekdayTargetMin: 2, weekdayTargetMax: 3 } as const
/** Applied with no employer reply after this many days → treat as ghosted. */
export const GHOSTED_AFTER_DAYS = 21

const DAY_MS = 24 * 60 * 60 * 1000

export interface PulseItem {
  status: ApplicationStatus
  appliedAt: string | null
  followUpAt?: string | null
  hasReply?: boolean
  /** A tailored resume already exists for this job. */
  hasResume?: boolean
  /** The latest tailor run failed and hasn't been retried. */
  tailorFailed?: boolean
}

export interface HuntPulse {
  appliedToday: number
  appliedThisWeek: number
  /** Weekdays elapsed this week, today included (0 on weekends before Monday). */
  weekdaysElapsed: number
  weekTargetMin: number
  weekTargetMax: number
  /** 'ahead' | 'on_pace' | 'behind' against the min target for days elapsed. */
  pace: 'ahead' | 'on_pace' | 'behind'
  active: number
  interviewing: number
  ghosted: number
  replies: number
  lastEmailAt: string | null
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Monday 00:00 of the week containing `d` (local time). */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const dow = x.getDay() // 0 Sun … 6 Sat
  x.setDate(x.getDate() - (dow === 0 ? 6 : dow - 1))
  return x
}

export function weekdaysElapsed(now: Date): number {
  const dow = now.getDay()
  if (dow === 0 || dow === 6) return 5
  return dow
}

export function isGhosted(item: PulseItem, now: Date = new Date()): boolean {
  if (item.status !== 'applied' || item.hasReply || !item.appliedAt) return false
  const applied = new Date(item.appliedAt).getTime()
  if (Number.isNaN(applied)) return false
  return now.getTime() - applied >= GHOSTED_AFTER_DAYS * DAY_MS
}

/** One short, actionable next step for a tracked job. */
export function nextStepFor(item: PulseItem, now: Date = new Date()): string {
  switch (item.status) {
    case 'bookmarked':
      if (item.tailorFailed) return 'Retry the tailor, then apply'
      return item.hasResume ? 'Apply with your tailored resume' : 'Tailor resume, then apply'
    case 'applying':
      return 'Finish and submit the application'
    case 'applied': {
      if (item.hasReply) return 'Reply to the recruiter'
      if (isGhosted(item, now)) return 'Likely ghosted — send a last nudge or close'
      const followUp = item.followUpAt ? new Date(item.followUpAt).getTime() : NaN
      if (!Number.isNaN(followUp) && followUp <= now.getTime()) return 'Follow-up due'
      return 'Wait for a reply'
    }
    case 'interviewing':
      return 'Prep for the next interview'
    case 'negotiating':
      return 'Negotiate the offer'
    case 'offer':
      return 'Decide on the offer'
    case 'accepted':
      return 'Done — accepted'
    case 'rejected':
      return 'Closed'
    default:
      return 'Review'
  }
}

const ACTIVE: readonly ApplicationStatus[] = ['applying', 'applied', 'interviewing', 'negotiating', 'offer']

export function computeHuntPulse(
  items: readonly PulseItem[],
  opts: {
    now?: Date
    lastEmailAt?: string | null
    cadence?: { weekdayTargetMin: number; weekdayTargetMax: number }
  } = {},
): HuntPulse {
  const now = opts.now ?? new Date()
  const cadence = opts.cadence ?? DEFAULT_CADENCE
  const today = startOfDay(now).getTime()
  const week = startOfWeek(now).getTime()

  let appliedToday = 0
  let appliedThisWeek = 0
  let active = 0
  let interviewing = 0
  let ghosted = 0
  let replies = 0

  for (const item of items) {
    const t = item.appliedAt ? new Date(item.appliedAt).getTime() : NaN
    if (!Number.isNaN(t)) {
      if (t >= today) appliedToday++
      if (t >= week) appliedThisWeek++
    }
    if (ACTIVE.includes(item.status)) active++
    if (item.status === 'interviewing' || item.status === 'negotiating') interviewing++
    if (isGhosted(item, now)) ghosted++
    if (item.hasReply) replies++
  }

  const days = weekdaysElapsed(now)
  const weekTargetMin = cadence.weekdayTargetMin * 5
  const weekTargetMax = cadence.weekdayTargetMax * 5
  const expectedMin = cadence.weekdayTargetMin * days
  const expectedMax = cadence.weekdayTargetMax * days
  const pace =
    appliedThisWeek > expectedMax ? 'ahead' : appliedThisWeek >= expectedMin ? 'on_pace' : 'behind'

  return {
    appliedToday,
    appliedThisWeek,
    weekdaysElapsed: days,
    weekTargetMin,
    weekTargetMax,
    pace,
    active,
    interviewing,
    ghosted,
    replies,
    lastEmailAt: opts.lastEmailAt ?? null,
  }
}
