import { describe, it, expect } from 'vitest'
import { computeHuntPulse, isGhosted, nextStepFor, startOfWeek, weekdaysElapsed } from '@/lib/applications/pulse'

// Wednesday, local noon
const NOW = new Date(2026, 10, 18, 12, 0, 0)
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString()

describe('pulse cadence', () => {
  it('weeks start Monday and count weekdays', () => {
    expect(startOfWeek(NOW).getDay()).toBe(1)
    expect(weekdaysElapsed(NOW)).toBe(3)
    expect(weekdaysElapsed(new Date(2026, 10, 22))).toBe(5) // Sunday
  })

  it('counts applies today / this week and paces against 2–3 per weekday', () => {
    const p = computeHuntPulse(
      [
        { status: 'applied', appliedAt: NOW.toISOString() },
        { status: 'applied', appliedAt: daysAgo(1) },
        { status: 'interviewing', appliedAt: daysAgo(2), hasReply: true },
        { status: 'applied', appliedAt: daysAgo(10) },
        { status: 'bookmarked', appliedAt: null },
      ],
      { now: NOW },
    )
    expect(p.appliedToday).toBe(1)
    expect(p.appliedThisWeek).toBe(3)
    expect(p.weekTargetMin).toBe(10)
    expect(p.weekTargetMax).toBe(15)
    expect(p.pace).toBe('behind') // 3 < 2*3
    expect(p.active).toBe(4)
    expect(p.interviewing).toBe(1)
    expect(p.replies).toBe(1)
  })

  it('reports on pace and ahead', () => {
    const many = (n: number) => Array.from({ length: n }, () => ({ status: 'applied' as const, appliedAt: NOW.toISOString() }))
    expect(computeHuntPulse(many(6), { now: NOW }).pace).toBe('on_pace')
    expect(computeHuntPulse(many(10), { now: NOW }).pace).toBe('ahead')
  })
})

describe('ghosted + next step', () => {
  it('flags applied-with-no-reply after 21 days', () => {
    expect(isGhosted({ status: 'applied', appliedAt: daysAgo(22) }, NOW)).toBe(true)
    expect(isGhosted({ status: 'applied', appliedAt: daysAgo(22), hasReply: true }, NOW)).toBe(false)
    expect(isGhosted({ status: 'applied', appliedAt: daysAgo(5) }, NOW)).toBe(false)
    expect(computeHuntPulse([{ status: 'applied', appliedAt: daysAgo(30) }], { now: NOW }).ghosted).toBe(1)
  })

  it('gives one next step per status', () => {
    expect(nextStepFor({ status: 'bookmarked', appliedAt: null }, NOW)).toMatch(/Tailor/)
    expect(nextStepFor({ status: 'bookmarked', appliedAt: null, hasResume: true }, NOW)).toBe(
      'Apply with your tailored resume',
    )
    expect(nextStepFor({ status: 'bookmarked', appliedAt: null, tailorFailed: true }, NOW)).toBe(
      'Retry the tailor, then apply',
    )
    expect(nextStepFor({ status: 'applied', appliedAt: daysAgo(2) }, NOW)).toBe('Wait for a reply')
    expect(nextStepFor({ status: 'applied', appliedAt: daysAgo(6), followUpAt: daysAgo(1) }, NOW)).toBe('Follow-up due')
    expect(nextStepFor({ status: 'applied', appliedAt: daysAgo(2), hasReply: true }, NOW)).toMatch(/recruiter/)
    expect(nextStepFor({ status: 'applied', appliedAt: daysAgo(30) }, NOW)).toMatch(/ghosted/)
    expect(nextStepFor({ status: 'interviewing', appliedAt: daysAgo(9) }, NOW)).toMatch(/interview/)
  })
})
