import { describe, expect, it, vi } from 'vitest'
import { ApplicationStatusError, setApplicationStatus } from '../status'

function mockDb(opts: {
  load?: { data: unknown; error: unknown }
  update?: { data: unknown; error: unknown }
  eventInsert?: ReturnType<typeof vi.fn>
  jobUpdate?: ReturnType<typeof vi.fn>
}) {
  const appsChain: Record<string, unknown> = {}
  appsChain.select = vi.fn(() => appsChain)
  appsChain.eq = vi.fn(() => appsChain)
  appsChain.update = vi.fn(() => appsChain)
  appsChain.maybeSingle = vi.fn().mockResolvedValue(opts.load ?? { data: null, error: null })
  appsChain.single = vi.fn().mockResolvedValue(opts.update ?? { data: null, error: null })

  const eventInsert = opts.eventInsert ?? vi.fn().mockResolvedValue({ error: null })
  const jobEq2 = vi.fn().mockResolvedValue({ error: null })
  const jobEq1 = vi.fn(() => ({ eq: jobEq2 }))
  const jobUpdate = opts.jobUpdate ?? vi.fn(() => ({ eq: jobEq1 }))

  const from = vi.fn((table: string) => {
    if (table === 'application_events') return { insert: eventInsert }
    if (table === 'jobs') return { update: jobUpdate }
    return appsChain
  })

  return { from, appsChain, eventInsert, jobUpdate }
}

describe('setApplicationStatus', () => {
  it('no-ops when status unchanged', async () => {
    const db = mockDb({
      load: {
        data: {
          id: 'a1',
          user_id: 'u1',
          job_id: 'j1',
          status: 'applied',
          applied_at: null,
          tailored_resume_id: null,
          notes: null,
          follow_up_at: null,
          source: 'manual',
          created_at: '',
          updated_at: '',
        },
        error: null,
      },
    })

    const result = await setApplicationStatus(db as never, {
      userId: 'u1',
      applicationId: 'a1',
      status: 'applied',
    })

    expect(result.status).toBe('applied')
    expect(db.appsChain.update).not.toHaveBeenCalled()
  })

  it('throws not_found when row missing', async () => {
    const db = mockDb({ load: { data: null, error: null } })
    await expect(
      setApplicationStatus(db as never, { userId: 'u1', jobId: 'j1', status: 'applied' })
    ).rejects.toBeInstanceOf(ApplicationStatusError)
  })

  it('writes status_change event and mirrors jobs', async () => {
    const current = {
      id: 'a1',
      user_id: 'u1',
      job_id: 'j1',
      status: 'not_applied' as const,
      applied_at: null,
      tailored_resume_id: null,
      notes: null,
      follow_up_at: null,
      source: 'manual',
      created_at: '',
      updated_at: '',
    }
    const updated = { ...current, status: 'applied' as const, applied_at: '2026-01-01T00:00:00.000Z' }
    const db = mockDb({
      load: { data: current, error: null },
      update: { data: updated, error: null },
    })

    const result = await setApplicationStatus(db as never, {
      userId: 'u1',
      applicationId: 'a1',
      status: 'applied',
      meta: { via: 'test' },
    })

    expect(result.status).toBe('applied')
    expect(db.eventInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'status_change',
        from_status: 'not_applied',
        to_status: 'applied',
        meta: { via: 'test' },
      })
    )
    expect(db.jobUpdate).toHaveBeenCalled()
  })
})
