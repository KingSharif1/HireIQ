import { describe, it, expect } from 'vitest'
import {
  checkOutreachTransition,
  stageTimestamps,
  summariseOutreach,
  staleOutreach,
  defaultOutreachStage,
  type OutreachRow,
} from '@/lib/referrals/outreach'
import { REFERRAL_STAGES } from '@/lib/referrals/stages'
import type { ReferralStage } from '@/types'

const NOW = new Date('2026-11-11T12:00:00.000Z')

function row(over: Partial<OutreachRow> & { id: string; stage: ReferralStage }): OutreachRow {
  return {
    connection_id: 'conn-1',
    job_id: null,
    application_id: null,
    message_draft: null,
    referral_strength: null,
    asked_at: null,
    replied_at: null,
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    ...over,
  }
}

describe('defaultOutreachStage', () => {
  it('starts as a draft', () => {
    expect(defaultOutreachStage()).toBe('drafting')
  })
})

describe('stageTimestamps', () => {
  it('records asked_at when the ask goes out', () => {
    expect(stageTimestamps('intro_asked', NOW)).toEqual({ asked_at: NOW.toISOString() })
  })

  it('records replied_at for reply-side stages', () => {
    for (const stage of ['replied', 'referred', 'declined', 'no_response'] as ReferralStage[]) {
      expect(stageTimestamps(stage, NOW)).toEqual({ replied_at: NOW.toISOString() })
    }
  })

  it('records nothing for a draft', () => {
    expect(stageTimestamps('drafting', NOW)).toEqual({})
  })
})

describe('checkOutreachTransition', () => {
  it('allows the documented funnel steps', () => {
    expect(checkOutreachTransition('drafting', 'intro_asked').ok).toBe(true)
    expect(checkOutreachTransition('intro_asked', 'replied').ok).toBe(true)
    expect(checkOutreachTransition('intro_asked', 'referred').ok).toBe(true)
  })

  it('rejects no-op transitions', () => {
    const result = checkOutreachTransition('drafting', 'drafting')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already/i)
  })

  it('rejects leaving a terminal stage', () => {
    for (const stage of ['referred', 'declined'] as ReferralStage[]) {
      const result = checkOutreachTransition(stage, 'intro_asked')
      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/final/i)
    }
  })

  it('rejects skipping backwards', () => {
    expect(checkOutreachTransition('intro_asked', 'drafting').ok).toBe(false)
  })
})

describe('summariseOutreach', () => {
  it('counts stages and computes conversion', () => {
    const rows = [
      row({ id: '1', stage: 'drafting' }),
      row({ id: '2', stage: 'intro_asked' }),
      row({ id: '3', stage: 'referred' }),
      row({ id: '4', stage: 'declined' }),
    ]
    const summary = summariseOutreach(rows)
    expect(summary.total).toBe(4)
    expect(summary.byStage.intro_asked).toBe(1)
    expect(summary.byStage.referred).toBe(1)
    expect(summary.asked).toBe(3)
    expect(summary.conversion).toBeCloseTo(1 / 3)
  })

  it('initialises every stage to zero and avoids divide-by-zero', () => {
    const summary = summariseOutreach([])
    for (const stage of REFERRAL_STAGES) expect(summary.byStage[stage]).toBe(0)
    expect(summary.conversion).toBe(0)
  })
})

describe('staleOutreach', () => {
  it('flags asks older than the stale window', () => {
    const rows = [
      row({ id: 'old', stage: 'intro_asked', asked_at: '2026-10-01T00:00:00.000Z' }),
      row({ id: 'fresh', stage: 'intro_asked', asked_at: '2026-11-09T00:00:00.000Z' }),
      row({ id: 'draft', stage: 'drafting' }),
      row({ id: 'done', stage: 'referred', asked_at: '2026-10-01T00:00:00.000Z' }),
    ]
    const stale = staleOutreach(rows, { now: NOW, staleDays: 7 })
    expect(stale.map((r) => r.id)).toEqual(['old'])
  })

  it('falls back to created_at when asked_at is missing', () => {
    const rows = [row({ id: 'x', stage: 'intro_asked', asked_at: null })]
    expect(staleOutreach(rows, { now: NOW, staleDays: 7 }).map((r) => r.id)).toEqual(['x'])
  })
})
