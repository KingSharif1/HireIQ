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

  it('beginAiOnce is exclusive', () => {
    expect(beginAiOnce('lock-a')).toBe(true)
    expect(beginAiOnce('lock-a')).toBe(false)
    endAiOnce('lock-a')
    expect(beginAiOnce('lock-a')).toBe(true)
    endAiOnce('lock-a')
  })
})
