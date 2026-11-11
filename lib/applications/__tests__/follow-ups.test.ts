import { describe, it, expect } from 'vitest'
import {
  computeFollowUps,
  suggestFollowUpDate,
  followUpDraft,
  DEFAULT_FOLLOW_UP_DAYS,
  type FollowUpCandidate,
} from '@/lib/applications/follow-ups'
import type { ApplicationStatus } from '@/types'

const NOW = new Date('2026-11-11T12:00:00.000Z')

function cand(over: Partial<FollowUpCandidate> & { applicationId: string }): FollowUpCandidate {
  return {
    company: 'Acme',
    title: 'Software Engineer',
    status: 'applied' as ApplicationStatus,
    appliedAt: '2026-11-01T12:00:00.000Z',
    followUpAt: null,
    hasReply: false,
    ...over,
  }
}

describe('suggestFollowUpDate', () => {
  it('adds the default number of days', () => {
    expect(suggestFollowUpDate('2026-11-01T12:00:00.000Z')).toBe(
      '2026-11-06T12:00:00.000Z',
    )
    expect(DEFAULT_FOLLOW_UP_DAYS).toBe(5)
  })

  it('returns null for an invalid date', () => {
    expect(suggestFollowUpDate('not-a-date')).toBeNull()
  })
})

describe('computeFollowUps', () => {
  it('marks an application due when applied_at + default days is in the past', () => {
    const plan = computeFollowUps([cand({ applicationId: 'a' })], { now: NOW })
    expect(plan.due.map((i) => i.candidate.applicationId)).toEqual(['a'])
    expect(plan.due[0].daysUntilDue).toBeLessThanOrEqual(0)
  })

  it('prefers an explicit follow_up_at over the derived date', () => {
    const plan = computeFollowUps(
      [cand({ applicationId: 'a', followUpAt: '2026-11-20T12:00:00.000Z' })],
      { now: NOW, upcomingDays: 30 },
    )
    expect(plan.due).toHaveLength(0)
    expect(plan.upcoming.map((i) => i.candidate.applicationId)).toEqual(['a'])
    expect(plan.upcoming[0].dueAt).toBe('2026-11-20T12:00:00.000Z')
  })

  it('keeps far-future follow-ups out of both buckets', () => {
    const plan = computeFollowUps(
      [cand({ applicationId: 'a', followUpAt: '2027-01-01T00:00:00.000Z' })],
      { now: NOW, upcomingDays: 7 },
    )
    expect(plan.due).toHaveLength(0)
    expect(plan.upcoming).toHaveLength(0)
    expect(plan.skipped[0].reason).toBe('later')
  })

  it('cancels follow-up when the employer replied', () => {
    const plan = computeFollowUps([cand({ applicationId: 'a', hasReply: true })], { now: NOW })
    expect(plan.due).toHaveLength(0)
    expect(plan.skipped[0].reason).toBe('replied')
  })

  it('skips closed stages', () => {
    for (const status of ['interviewing', 'offer', 'rejected', 'accepted'] as ApplicationStatus[]) {
      const plan = computeFollowUps([cand({ applicationId: 'a', status })], { now: NOW })
      expect(plan.due).toHaveLength(0)
      expect(plan.skipped[0].reason).toBe('closed')
    }
  })

  it('skips applications that were never submitted', () => {
    for (const status of ['bookmarked', 'applying'] as ApplicationStatus[]) {
      const plan = computeFollowUps([cand({ applicationId: 'a', status })], { now: NOW })
      expect(plan.skipped[0].reason).toBe('not_submitted')
    }
  })

  it('skips applied applications with no date at all', () => {
    const plan = computeFollowUps(
      [cand({ applicationId: 'a', appliedAt: null, followUpAt: null })],
      { now: NOW },
    )
    expect(plan.skipped[0].reason).toBe('no_date')
  })

  it('sorts most-overdue first', () => {
    const plan = computeFollowUps(
      [
        cand({ applicationId: 'recent', appliedAt: '2026-11-02T12:00:00.000Z' }), // due Nov 7
        cand({ applicationId: 'old', appliedAt: '2026-10-01T12:00:00.000Z' }), // due Oct 6
      ],
      { now: NOW },
    )
    expect(plan.due.map((i) => i.candidate.applicationId)).toEqual(['old', 'recent'])
  })

  it('puts near-future dates into upcoming and sorts them', () => {
    const plan = computeFollowUps(
      [
        cand({ applicationId: 'b', followUpAt: '2026-11-15T12:00:00.000Z' }),
        cand({ applicationId: 'a', followUpAt: '2026-11-13T12:00:00.000Z' }),
      ],
      { now: NOW, upcomingDays: 7 },
    )
    expect(plan.upcoming.map((i) => i.candidate.applicationId)).toEqual(['a', 'b'])
  })

  it('honours a custom default cadence', () => {
    const plan = computeFollowUps([cand({ applicationId: 'a' })], { now: NOW, defaultDays: 30 })
    expect(plan.due).toHaveLength(0)
    expect(plan.skipped[0].reason).toBe('later')
  })
})

describe('followUpDraft', () => {
  it('mentions the role and company', () => {
    const plan = computeFollowUps([cand({ applicationId: 'a' })], { now: NOW })
    const text = followUpDraft(plan.due[0])
    expect(text).toContain('Acme')
    expect(text).toContain('Software Engineer')
    expect(text.startsWith('Hi Acme team,')).toBe(true)
  })

  it('falls back gracefully without a company', () => {
    const plan = computeFollowUps([cand({ applicationId: 'a', company: '' })], { now: NOW })
    expect(followUpDraft(plan.due[0]).startsWith('Hi there team,')).toBe(true)
  })
})
