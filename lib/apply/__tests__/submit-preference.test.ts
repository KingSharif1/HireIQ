import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queueServerApply } from '@/lib/apply/queue'

const USER_ID = 'user-1'
const JOB_ID = 'job-1'

const JOB_ROW = {
  id: JOB_ID,
  user_id: USER_ID,
  apply_url: 'https://boards.greenhouse.io/acme/jobs/123',
  title: 'Engineer',
  company: 'Acme',
  extracted_data: {},
}

let tableRows: Record<string, { data: unknown; error?: unknown }>
let inserts: Record<string, unknown[]>

function makeBuilder(table: string) {
  const builder = {
    _insert: undefined as unknown,
    select() {
      return builder
    },
    insert(payload: unknown) {
      ;(inserts[table] ??= []).push(payload)
      builder._insert = payload
      return builder
    },
    eq() {
      return builder
    },
    order() {
      return builder
    },
    limit() {
      return builder
    },
    maybeSingle() {
      const row = tableRows[table]
      return Promise.resolve({ data: row?.data ?? null, error: row?.error ?? null })
    },
    single() {
      return Promise.resolve({ data: { id: 'run-1', ...(builder._insert as object) }, error: null })
    },
  }
  return builder
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => makeBuilder(table),
  }),
}))

vi.mock('@/lib/ai/usage', () => ({
  recordAutoApplyUsage: vi.fn(async () => {}),
}))

vi.mock('@/lib/google/token-access', () => ({
  ensureAccessTokenForUser: vi.fn(async () => null),
}))

function seedTables(profileRow: unknown) {
  tableRows = {
    jobs: { data: JOB_ROW },
    profiles: { data: profileRow },
    applications: { data: null },
    apply_runs: { data: null },
  }
  inserts = {}
}

beforeEach(() => {
  seedTables({ auto_apply_submit: true })
})

describe('queueServerApply submit preference', () => {
  it('defaults to submit=true when the preference is missing/null', async () => {
    seedTables({ auto_apply_submit: null })
    await queueServerApply({ userId: USER_ID, jobId: JOB_ID })
    const run = inserts.apply_runs?.[0] as { submit: boolean }
    expect(run.submit).toBe(true)
  })

  it('writes submit=true when the preference is true', async () => {
    await queueServerApply({ userId: USER_ID, jobId: JOB_ID })
    const run = inserts.apply_runs?.[0] as { submit: boolean }
    expect(run.submit).toBe(true)
  })

  it('writes submit=false when the user chose review-first', async () => {
    seedTables({ auto_apply_submit: false })
    await queueServerApply({ userId: USER_ID, jobId: JOB_ID })
    const run = inserts.apply_runs?.[0] as { submit: boolean }
    expect(run.submit).toBe(false)
  })

  it('maps a missing profile row to 404 and a profile DB error to 500', async () => {
    seedTables(null)
    await expect(queueServerApply({ userId: USER_ID, jobId: JOB_ID })).rejects.toMatchObject({
      name: 'ApplyQueueError',
      message: 'Profile not found',
      status: 404,
    })
    tableRows.profiles = { data: null, error: { message: 'column missing' } }
    await expect(queueServerApply({ userId: USER_ID, jobId: JOB_ID })).rejects.toMatchObject({
      name: 'ApplyQueueError',
      message: 'column missing',
      status: 500,
    })
  })

  it('ignores a smuggled submit flag — server owns the value', async () => {
    seedTables({ auto_apply_submit: true })
    await queueServerApply({ userId: USER_ID, jobId: JOB_ID, submit: false } as never)
    const run = inserts.apply_runs?.[0] as { submit: boolean }
    expect(run.submit).toBe(true)
  })
})
