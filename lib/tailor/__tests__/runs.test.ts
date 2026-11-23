import { describe, expect, it } from 'vitest'
import {
  claudeCallsForSession,
  isBusyTailorStatus,
  isStaleBusyRun,
  shouldAttachToRun,
  shouldKickGapWorker,
  TAILOR_RUN_CLAUDE,
  TAILOR_RUN_STALE_MS,
  type TailorRunStatus,
} from '@/lib/tailor/run-types'

describe('durable tailor run', () => {
  it('caps Claude at 3 calls (draft + parse retry + optional weave)', () => {
    expect(TAILOR_RUN_CLAUDE.total).toBe(3)
    expect(TAILOR_RUN_CLAUDE.gap).toBe(0)
    expect(TAILOR_RUN_CLAUDE.generate).toBe(2)
    expect(claudeCallsForSession(true)).toBe(3)
    expect(claudeCallsForSession(false)).toBe(2)
  })

  it('attaches to an in-flight or review run instead of starting another', () => {
    expect(shouldAttachToRun('analyzing_gaps')).toBe(true)
    expect(shouldAttachToRun('awaiting_answers')).toBe(true)
    expect(shouldAttachToRun('generating')).toBe(true)
    expect(shouldAttachToRun('needs_review')).toBe(true)
    expect(shouldAttachToRun('failed')).toBe(false)
    expect(shouldAttachToRun(null)).toBe(false)
  })

  it('never kicks a second gap worker after Claude is reserved', () => {
    expect(shouldKickGapWorker({ status: 'analyzing_gaps', gap_reserved: false })).toBe(true)
    expect(shouldKickGapWorker({ status: 'analyzing_gaps', gap_reserved: true })).toBe(false)
    expect(shouldKickGapWorker({ status: 'generating', gap_reserved: false })).toBe(false)
  })

  it('treats 132 remounts as one session (the Apple fork-bomb)', () => {
    let status: TailorRunStatus | null = null
    let starts = 0
    for (let i = 0; i < 132; i++) {
      if (shouldAttachToRun(status)) continue
      starts += 1
      status = 'analyzing_gaps'
    }
    expect(starts).toBe(1)
  })

  it('does not start a new paid run while generating, even after navigation', () => {
    const status: TailorRunStatus = 'generating'
    expect(isBusyTailorStatus(status)).toBe(true)
    expect(shouldAttachToRun(status)).toBe(true)
    expect(shouldKickGapWorker({ status, gap_reserved: true })).toBe(false)
  })

  it('fails a busy run only after the worker maxDuration window', () => {
    const now = Date.parse('2026-08-14T16:00:00.000Z')
    const fresh = {
      status: 'generating',
      updated_at: new Date(now - 30_000).toISOString(),
    }
    const stale = {
      status: 'generating',
      updated_at: new Date(now - TAILOR_RUN_STALE_MS - 1).toISOString(),
    }
    const waiting = {
      status: 'awaiting_answers',
      updated_at: new Date(now - TAILOR_RUN_STALE_MS - 1).toISOString(),
    }
    expect(isStaleBusyRun(fresh, now)).toBe(false)
    expect(isStaleBusyRun(stale, now)).toBe(true)
    expect(isStaleBusyRun(waiting, now)).toBe(false)
  })
})

describe('visibleTailorRunStatus', () => {
  const now = Date.parse('2026-11-23T12:00:00Z')
  it('surfaces failed and silently-stuck runs as failed', async () => {
    const { visibleTailorRunStatus } = await import('@/lib/tailor/run-types')
    expect(visibleTailorRunStatus({ status: 'failed', updated_at: '2026-11-23T11:00:00Z' }, { nowMs: now })).toBe('failed')
    expect(visibleTailorRunStatus({ status: 'generating', updated_at: '2026-11-23T11:00:00Z' }, { nowMs: now })).toBe('failed')
    expect(visibleTailorRunStatus({ status: 'generating', updated_at: '2026-11-23T11:59:00Z' }, { nowMs: now })).toBe('generating')
    expect(visibleTailorRunStatus({ status: 'needs_review', updated_at: '2026-11-23T11:00:00Z' }, { nowMs: now })).toBe('needs_review')
  })
  it('hides an old failure once a newer resume exists, and cancelled runs', async () => {
    const { visibleTailorRunStatus } = await import('@/lib/tailor/run-types')
    expect(visibleTailorRunStatus({ status: 'failed', updated_at: '2026-11-20T00:00:00Z' }, { nowMs: now, latestResumeAt: '2026-11-21T00:00:00Z' })).toBeNull()
    expect(visibleTailorRunStatus({ status: 'cancelled', updated_at: '2026-11-23T11:00:00Z' }, { nowMs: now })).toBeNull()
    expect(visibleTailorRunStatus(null)).toBeNull()
  })
})
