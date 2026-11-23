import { describe, it, expect } from 'vitest'
import { ledgerSchema, mapLedgerStatus, planLedgerImport } from '@/lib/applications/ledger-import'

const ledger = {
  cadence: { weekdayTargetMin: 2, weekdayTargetMax: 3 },
  applications: [
    { company: 'Acme', title: 'Associate SWE', url: 'https://boards.greenhouse.io/acme/jobs/1', status: 'applied', appliedDate: '2026-09-19', emailNote: 'Greenhouse confirmation received', nextStep: 'Await recruiter review' },
    { company: 'Defense Co', title: 'SWE I', url: 'https://example.com/jobs/2', status: 'skipped', appliedDate: null, skipReason: 'Requires active clearance' },
  ],
}

describe('ledger import', () => {
  it('validates the ledger shape', () => {
    expect(ledgerSchema.safeParse(ledger).success).toBe(true)
    expect(ledgerSchema.safeParse({ applications: [] }).success).toBe(false)
    expect(ledgerSchema.safeParse({ applications: [{ company: 'x', title: 'y', url: 'nope', status: 'applied' }] }).success).toBe(false)
  })

  it('maps ledger statuses onto DB statuses', () => {
    expect(mapLedgerStatus('screen')).toBe('screening')
    expect(mapLedgerStatus('Skipped')).toBe('skipped')
    expect(mapLedgerStatus('recruiter_screen')).toBe('screening')
    expect(mapLedgerStatus('ghosted')).toBe('applied')
    expect(mapLedgerStatus('weird')).toBe('bookmarked')
  })

  it('plans rows with applied dates and notes', () => {
    const [applied, skipped] = planLedgerImport(ledgerSchema.parse(ledger).applications)
    expect(applied.status).toBe('applied')
    expect(applied.appliedAt?.startsWith('2026-09-19')).toBe(true)
    expect(applied.notes).toContain('Greenhouse confirmation')
    expect(skipped.status).toBe('skipped')
    expect(skipped.appliedAt).toBeNull()
    expect(skipped.notes).toContain('Skipped: Requires active clearance')
  })
})
