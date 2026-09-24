import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, PATCH } from '@/app/api/profile/auto-apply/route'
import { POST } from '@/app/api/apply/jobs/[jobId]/queue/route'
import { dispatchApplyWorker, queueServerApply } from '@/lib/apply/queue'

const USER_ID = 'user-1'

let authUser: { id: string } | null = { id: USER_ID }
let profileRow: unknown = null
let profileError: { message: string } | null = null
let updateCalls: unknown[] = []

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authUser } }) },
    from: (_table: string) => {
      const builder = {
        select() {
          return builder
        },
        eq() {
          return builder
        },
        update(payload: unknown) {
          updateCalls.push(payload)
          return builder
        },
        maybeSingle: async () => ({ data: profileRow, error: profileError }),
      }
      return builder
    },
  }),
}))

vi.mock('@/lib/apply/queue', () => {
  class ApplyQueueError extends Error {
    constructor(
      message: string,
      readonly status = 400,
    ) {
      super(message)
      this.name = 'ApplyQueueError'
    }
  }
  return {
    ApplyQueueError,
    queueServerApply: vi.fn(),
    dispatchApplyWorker: vi.fn(),
    loadServerApplyContext: vi.fn(),
  }
})

vi.mock('@/lib/apply/process-run', () => ({
  processApplyRun: vi.fn(),
}))

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  authUser = { id: USER_ID }
  profileRow = null
  profileError = null
  updateCalls = []
  vi.mocked(queueServerApply).mockReset()
  vi.mocked(dispatchApplyWorker).mockReset()
})

describe('GET /api/profile/auto-apply', () => {
  it('defaults to submit=true when the preference column is null', async () => {
    profileRow = { auto_apply_submit: null }
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ submit: true })
  })

  it('returns submit=false when the user chose review-first', async () => {
    profileRow = { auto_apply_submit: false }
    const res = await GET()
    expect(await res.json()).toEqual({ submit: false })
  })

  it('returns 404 when the profile row is missing', async () => {
    profileRow = null
    const res = await GET()
    expect(res.status).toBe(404)
  })

  it('returns 500 on a database error — never defaults to submit', async () => {
    profileError = { message: 'column does not exist' }
    const res = await GET()
    expect(res.status).toBe(500)
  })

  it('rejects unauthenticated calls', async () => {
    authUser = null
    const res = await GET()
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/profile/auto-apply', () => {
  it('rejects a non-boolean submit', async () => {
    const res = await PATCH(
      jsonRequest('http://localhost/api/profile/auto-apply', 'PATCH', { submit: 'yes' }),
    )
    expect(res.status).toBe(400)
  })

  it('rejects a missing submit key', async () => {
    const res = await PATCH(jsonRequest('http://localhost/api/profile/auto-apply', 'PATCH', {}))
    expect(res.status).toBe(400)
  })

  it('persists submit=false and echoes it', async () => {
    profileRow = { auto_apply_submit: false }
    const res = await PATCH(
      jsonRequest('http://localhost/api/profile/auto-apply', 'PATCH', { submit: false }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ submit: false })
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]).toMatchObject({ auto_apply_submit: false })
  })

  it('returns 404 when the update affects no profile row', async () => {
    profileRow = null
    const res = await PATCH(
      jsonRequest('http://localhost/api/profile/auto-apply', 'PATCH', { submit: true }),
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /api/apply/jobs/[jobId]/queue', () => {
  it('does not forward a client submit flag to the queue', async () => {
    vi.mocked(queueServerApply).mockResolvedValue({ id: 'run-1', status: 'queued' } as never)
    vi.mocked(dispatchApplyWorker).mockResolvedValue({ dispatched: false, reason: 'no worker' })

    const res = await POST(
      jsonRequest('http://localhost/api/apply/jobs/job-1/queue', 'POST', {
        submit: false,
        force: true,
      }),
      { params: Promise.resolve({ jobId: 'job-1' }) },
    )

    expect(res.status).toBe(202)
    expect(queueServerApply).toHaveBeenCalledTimes(1)
    expect(queueServerApply).toHaveBeenCalledWith({
      userId: USER_ID,
      jobId: 'job-1',
      force: true,
    })
    const callArg = vi.mocked(queueServerApply).mock.calls[0][0] as Record<string, unknown>
    expect('submit' in callArg).toBe(false)
  })
})
