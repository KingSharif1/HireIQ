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
  it('caps Claude at 2 calls (gap + one rewrite), or 1 when ATS finds no gaps', () => {
    expect(TAILOR_RUN_CLAUDE.total).toBe(2)
    expect(claudeCallsForSession(true)).toBe(2)
    expect(claudeCallsForSession(false)).toBe(1)
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
