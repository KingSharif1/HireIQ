import { describe, it, expect } from 'vitest'
import {
  planDailyRun,
  normalizeCompany,
  isBlockedHost,
  type DailyRunCandidate,
} from '@/lib/apply/daily-run'
import type { ApplicationStatus } from '@/types'

const GREENHOUSE = 'https://job-boards.greenhouse.io/acme/jobs/123'
const LEVER = 'https://jobs.lever.co/beta/abc-123'
const WORKDAY = 'https://acme.wd1.myworkdayjobs.com/en-US/careers/job/123'

function cand(
  over: Partial<DailyRunCandidate> & { applicationId: string; applyUrl?: string | null },
): DailyRunCandidate {
  return {
    jobId: `job-${over.applicationId}`,
    company: 'Acme',
    title: 'Software Engineer',
    applyUrl: GREENHOUSE,
    status: 'applying' as ApplicationStatus,
    applyEase: null,
    ...over,
  }
}

describe('normalizeCompany', () => {
  it('ignores case and punctuation', () => {
    expect(normalizeCompany('Acme Corp.')).toBe(normalizeCompany('acme corp'))
    expect(normalizeCompany('Acme  Inc')).toBe('acmeinc')
  })
})

describe('isBlockedHost', () => {
  it('blocks LinkedIn and Indeed subdomains', () => {
    expect(isBlockedHost('https://www.linkedin.com/jobs/1')).toBe(true)
    expect(isBlockedHost('https://indeed.com/viewjob?jk=1')).toBe(true)
  })

  it('allows ATS hosts', () => {
    expect(isBlockedHost(GREENHOUSE)).toBe(false)
    expect(isBlockedHost(LEVER)).toBe(false)
  })

  it('is false for unparseable urls', () => {
    expect(isBlockedHost('not a url')).toBe(false)
  })
})

describe('planDailyRun', () => {
  it('queues eligible applications up to the limit', () => {
    const plan = planDailyRun(
      [cand({ applicationId: 'a' }), cand({ applicationId: 'b' }), cand({ applicationId: 'c' })],
      { limit: 2, creditsRemaining: 10 },
    )
    expect(plan.queued.map((q) => q.candidate.applicationId)).toEqual(['a', 'b'])
    expect(plan.stopReason).toBe('limit')
    expect(plan.creditsUsed).toBe(2)
  })

  it('skips anything not in the applying state', () => {
    const plan = planDailyRun(
      [cand({ applicationId: 'a', status: 'applied' as ApplicationStatus })],
      { limit: 5, creditsRemaining: 10 },
    )
    expect(plan.queued).toHaveLength(0)
    expect(plan.skipped[0].reason).toBe('not_queued')
  })

  it('is idempotent for applications queued today', () => {
    const plan = planDailyRun([cand({ applicationId: 'a' })], {
      limit: 5,
      creditsRemaining: 10,
      alreadyQueuedToday: ['a'],
    })
    expect(plan.queued).toHaveLength(0)
    expect(plan.skipped[0].reason).toBe('already_queued_today')
  })

  it('enforces the non-compete block list', () => {
    const plan = planDailyRun([cand({ applicationId: 'a', company: 'Acme Corp.' })], {
      limit: 5,
      creditsRemaining: 10,
      blockedCompanies: ['acme corp'],
    })
    expect(plan.queued).toHaveLength(0)
    expect(plan.skipped[0].reason).toBe('blocked_company')
  })

  it('skips LinkedIn and Indeed postings', () => {
    const plan = planDailyRun(
      [
        cand({ applicationId: 'li', applyUrl: 'https://www.linkedin.com/jobs/view/1' }),
        cand({ applicationId: 'in', applyUrl: 'https://indeed.com/viewjob?jk=1' }),
      ],
      { limit: 5, creditsRemaining: 10 },
    )
    expect(plan.skipped.map((s) => s.reason)).toEqual(['blocked_host', 'blocked_host'])
  })

  it('skips postings with no apply url', () => {
    const plan = planDailyRun([cand({ applicationId: 'a', applyUrl: null })], {
      limit: 5,
      creditsRemaining: 10,
    })
    expect(plan.skipped[0].reason).toBe('no_apply_url')
  })

  it('skips account portals that cannot be hosted-automated', () => {
    const plan = planDailyRun([cand({ applicationId: 'a', applyUrl: WORKDAY })], {
      limit: 5,
      creditsRemaining: 10,
    })
    expect(plan.skipped[0].reason).toBe('account_portal')
  })

  it('prices a 3-credit portal when the ease signal says hosted is possible', () => {
    const plan = planDailyRun([cand({ applicationId: 'hard', applyUrl: WORKDAY, applyEase: 'easy' })], {
      limit: 5,
      creditsRemaining: 3,
    })
    expect(plan.queued[0].credits).toBe(3)
    expect(plan.creditsUsed).toBe(3)
    expect(plan.creditsRemaining).toBe(0)
  })

  it('skips a 3-credit portal when the budget cannot cover it', () => {
    const plan = planDailyRun([cand({ applicationId: 'hard', applyUrl: WORKDAY, applyEase: 'easy' })], {
      limit: 5,
      creditsRemaining: 2,
    })
    expect(plan.queued).toHaveLength(0)
    expect(plan.skipped[0].reason).toBe('insufficient_credits')
  })

  it('keeps scanning after an unaffordable candidate so cheaper ones still fit', () => {
    const plan = planDailyRun(
      [
        cand({ applicationId: 'first' }),
        cand({ applicationId: 'second' }),
        cand({ applicationId: 'third' }),
      ],
      { limit: 5, creditsRemaining: 1 },
    )
    expect(plan.queued.map((q) => q.candidate.applicationId)).toEqual(['first'])
    expect(plan.skipped.map((s) => s.reason)).toEqual(['insufficient_credits', 'insufficient_credits'])
    expect(plan.stopReason).toBe('credits')
  })

  it('handles a zero limit without queueing', () => {
    const plan = planDailyRun([cand({ applicationId: 'a' })], { limit: 0, creditsRemaining: 10 })
    expect(plan.queued).toHaveLength(0)
    expect(plan.stopReason).toBe('limit')
  })

  it('reports exhausted when everything eligible was queued', () => {
    const plan = planDailyRun([cand({ applicationId: 'a' })], { limit: 5, creditsRemaining: 10 })
    expect(plan.stopReason).toBe('exhausted')
    expect(plan.creditsRemaining).toBe(9)
  })
})
