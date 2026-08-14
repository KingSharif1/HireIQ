import { describe, expect, it } from 'vitest'
import { AiInFlightError, beginAiOnce, endAiOnce, withAiOnce } from '@/lib/ai/once'

describe('withAiOnce', () => {
  it('rejects a second overlapping call', async () => {
    let release!: () => void
    const first = withAiOnce('test-key', () => new Promise<string>(resolve => {
      release = () => resolve('ok')
    }))

    await expect(withAiOnce('test-key', async () => 'nope')).rejects.toBeInstanceOf(AiInFlightError)

    release()
    await expect(first).resolves.toBe('ok')
    await expect(withAiOnce('test-key', async () => 'after')).resolves.toBe('after')
  })

  it('only one of 20 overlapping calls runs', async () => {
    let running = 0
    let maxRunning = 0
    let started = 0
    const tasks = Array.from({ length: 20 }, () =>
      withAiOnce('burst', async () => {
        started += 1
        running += 1
        maxRunning = Math.max(maxRunning, running)
        await new Promise(r => setTimeout(r, 5))
        running -= 1
        return 'ok'
      }).catch((err: unknown) => err),
    )
    const results = await Promise.all(tasks)
    const ok = results.filter(r => r === 'ok')
    const blocked = results.filter(r => r instanceof AiInFlightError)
    expect(started).toBe(1)
    expect(ok).toHaveLength(1)
    expect(blocked).toHaveLength(19)
    expect(maxRunning).toBe(1)
  })
})
