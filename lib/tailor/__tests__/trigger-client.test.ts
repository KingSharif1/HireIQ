import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const trigger = vi.hoisted(() => vi.fn())
const afterFn = vi.hoisted(() => vi.fn())
const record = vi.hoisted(() =>
  vi.fn(async (_runId: string, _userId: string, _err: unknown) =>
    'The tailor worker didn’t start. Try again — your profile wasn’t changed.',
  ),
)

vi.mock('@/trigger/tailor-run', () => ({
  tailorRun: { trigger },
}))

vi.mock('next/server', () => ({
  after: (fn: () => unknown) => afterFn(fn),
}))

vi.mock('@/lib/tailor/kick-failure', () => ({
  recordTailorKickFailure: (runId: string, userId: string, err: unknown) =>
    record(runId, userId, err),
}))

vi.mock('@/lib/tailor/execute-run', () => ({
  executeGapPhase: vi.fn(async () => undefined),
  executeGeneratePhase: vi.fn(async () => undefined),
}))

import { kickTailorWorker, tailorDispatchPlan } from '@/lib/tailor/trigger-client'

const ENV_KEYS = ['TRIGGER_SECRET_KEY', 'VERCEL', 'VERCEL_ENV'] as const

describe('tailorDispatchPlan', () => {
  it('uses Trigger.dev for a production key and skips a dev key on Vercel', () => {
    expect(tailorDispatchPlan({ TRIGGER_SECRET_KEY: 'tr_prod_abc', VERCEL: '1', NODE_ENV: 'production' })).toBe(
      'trigger',
    )
    expect(tailorDispatchPlan({ TRIGGER_SECRET_KEY: 'tr_dev_abc', VERCEL: '1', VERCEL_ENV: 'production' })).toBe(
      'after',
    )
    expect(tailorDispatchPlan({ TRIGGER_SECRET_KEY: 'tr_dev_abc', NODE_ENV: 'development' })).toBe('trigger')
    expect(tailorDispatchPlan({})).toBe('after')
  })
})

describe('kickTailorWorker', () => {
  const previous: Record<string, string | undefined> = {}

  beforeEach(() => {
    trigger.mockReset()
    afterFn.mockReset()
    record.mockClear()
    for (const key of ENV_KEYS) previous[key] = process.env[key]
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  })

  it('enqueues when a production key is set', async () => {
    process.env.TRIGGER_SECRET_KEY = 'tr_prod_live'
    process.env.VERCEL = '1'
    trigger.mockResolvedValue({ id: 'run_1' })

    const result = await kickTailorWorker('run-1', 'user-1', 'gap')
    expect(result).toEqual({ via: 'trigger' })
    expect(trigger).toHaveBeenCalledTimes(1)
    expect(afterFn).not.toHaveBeenCalled()
    expect(record).not.toHaveBeenCalled()
  })

  it('does not enqueue a dev key on Vercel', async () => {
    process.env.TRIGGER_SECRET_KEY = 'tr_dev_only'
    process.env.VERCEL = '1'
    process.env.VERCEL_ENV = 'production'

    const result = await kickTailorWorker('run-1', 'user-1', 'gap')
    expect(result).toEqual({ via: 'after' })
    expect(trigger).not.toHaveBeenCalled()
    expect(afterFn).toHaveBeenCalledTimes(1)
  })

  it('falls back in-process when trigger() throws', async () => {
    process.env.TRIGGER_SECRET_KEY = 'tr_prod_live'
    process.env.VERCEL = '1'
    trigger.mockRejectedValue(new Error('Trigger.dev rejected the enqueue'))

    const result = await kickTailorWorker('run-1', 'user-1', 'gap')
    expect(result).toEqual({ via: 'after' })
    expect(afterFn).toHaveBeenCalledTimes(1)
    expect(record).not.toHaveBeenCalled()
  })

  it('marks the run failed when the worker cannot be scheduled', async () => {
    process.env.TRIGGER_SECRET_KEY = 'tr_prod_live'
    process.env.VERCEL = '1'
    trigger.mockRejectedValue(new Error('Trigger.dev rejected the enqueue'))
    afterFn.mockImplementation(() => {
      throw new Error('after() unavailable')
    })

    const result = await kickTailorWorker('run-1', 'user-1', 'generate', { q1: 'yes' })
    expect(result.via).toBe('failed')
    if (result.via === 'failed') {
      expect(result.error).toMatch(/didn’t start/i)
    }
    expect(record).toHaveBeenCalledWith('run-1', 'user-1', expect.any(Error))
  })
})
