import { estimateApplyCredits } from '@/lib/apply/credit-cost'
import { canHostedAutoApply } from '@/lib/apply/ease'
import type { ApplicationStatus } from '@/types'

/**
 * Daily-run planning — the "auto-apply to N jobs a day" contract from
 * docs/JOB-HUB-PLAN.md, expressed as a pure function so the rules are testable.
 *
 * Rules (all enforced here, not in the route):
 *  - only applications parked in `applying` are eligible;
 *  - idempotent: an application already queued today is never queued twice;
 *  - non-compete / stop-rule: companies in the block list are never applied to;
 *  - LinkedIn and Indeed are blocked (they forbid automated submission);
 *  - account-portal postings are skipped (not hosted-automatable);
 *  - the run spends at most `creditsRemaining`, cheapest work first-fit;
 *  - at most `limit` queued per run.
 */

export const DAILY_RUN_STATUS: ApplicationStatus = 'applying'

export interface DailyRunCandidate {
  applicationId: string
  jobId: string
  company: string
  title: string
  applyUrl: string | null
  status: ApplicationStatus
  applyEase?: 'easy' | 'hard' | 'unknown' | null
}

export type DailyRunSkipReason =
  | 'not_queued'
  | 'already_queued_today'
  | 'blocked_company'
  | 'blocked_host'
  | 'no_apply_url'
  | 'account_portal'
  | 'insufficient_credits'

export interface DailyRunSkip {
  candidate: DailyRunCandidate
  reason: DailyRunSkipReason
}

export interface DailyRunQueued {
  candidate: DailyRunCandidate
  credits: number
}

export interface DailyRunPlan {
  queued: DailyRunQueued[]
  skipped: DailyRunSkip[]
  creditsUsed: number
  creditsRemaining: number
  stopReason: 'limit' | 'credits' | 'exhausted'
}

export interface DailyRunOptions {
  limit: number
  creditsRemaining: number
  /** Application ids already queued today (idempotency). */
  alreadyQueuedToday?: Iterable<string>
  /** Companies the user must not apply to (non-compete / stop-rule). */
  blockedCompanies?: Iterable<string>
}

const BLOCKED_HOSTS = ['linkedin.com', 'indeed.com']

/** Case/punctuation-insensitive company key ("Acme Corp." === "acme corp"). */
export function normalizeCompany(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function isBlockedHost(applyUrl: string): boolean {
  try {
    const host = new URL(applyUrl).hostname.toLowerCase()
    return BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))
  } catch {
    return false
  }
}

export function planDailyRun(
  candidates: readonly DailyRunCandidate[],
  opts: DailyRunOptions,
): DailyRunPlan {
  const limit = Math.max(0, Math.floor(opts.limit))
  const already = new Set(opts.alreadyQueuedToday ?? [])
  const blocked = new Set(
    [...(opts.blockedCompanies ?? [])].map(normalizeCompany).filter((name) => name.length > 0),
  )

  const queued: DailyRunQueued[] = []
  const skipped: DailyRunSkip[] = []
  let creditsUsed = 0
  let hitLimit = false
  let hitCredits = false

  for (const candidate of candidates) {
    if (candidate.status !== DAILY_RUN_STATUS) {
      skipped.push({ candidate, reason: 'not_queued' })
      continue
    }
    if (already.has(candidate.applicationId)) {
      skipped.push({ candidate, reason: 'already_queued_today' })
      continue
    }
    if (blocked.has(normalizeCompany(candidate.company))) {
      skipped.push({ candidate, reason: 'blocked_company' })
      continue
    }

    const url = (candidate.applyUrl ?? '').trim()
    if (!url) {
      skipped.push({ candidate, reason: 'no_apply_url' })
      continue
    }
    if (isBlockedHost(url)) {
      skipped.push({ candidate, reason: 'blocked_host' })
      continue
    }
    if (!canHostedAutoApply(url, candidate.applyEase ? { apply_ease: candidate.applyEase } : null)) {
      skipped.push({ candidate, reason: 'account_portal' })
      continue
    }

    if (queued.length >= limit) {
      hitLimit = true
      break
    }

    const credits = estimateApplyCredits({ url }).credits
    if (creditsUsed + credits > opts.creditsRemaining) {
      // Keep going: a later 1-credit posting may still fit.
      skipped.push({ candidate, reason: 'insufficient_credits' })
      hitCredits = true
      continue
    }

    queued.push({ candidate, credits })
    creditsUsed += credits
  }

  return {
    queued,
    skipped,
    creditsUsed,
    creditsRemaining: opts.creditsRemaining - creditsUsed,
    stopReason: hitLimit ? 'limit' : hitCredits ? 'credits' : 'exhausted',
  }
}
