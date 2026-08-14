import { describe, expect, it } from 'vitest'
import { AI_SDK_MAX_RETRIES, TAILOR_MAX_AI_CALLS, TAILOR_MAX_RETRIES, estimateTokenCostUsd, formatUsd, typicalActionCostUsd } from '@/lib/ai/models'
import { extractTokenUsage } from '@/lib/ai/usage'

describe('estimateTokenCostUsd', () => {
  it('prices Haiku 4.5 at $1/$5 per MTok', () => {
    expect(estimateTokenCostUsd('claude-haiku-4-5-20251001', 1_000_000, 1_000_000)).toBe(6)
  })

  it('prices Sonnet 4.6 at $3/$15 per MTok', () => {
    expect(estimateTokenCostUsd('claude-sonnet-4-6', 1_000_000, 0)).toBe(3)
    expect(estimateTokenCostUsd('claude-sonnet-4-6', 0, 1_000_000)).toBe(15)
  })

  it('prices a typical tailor action on default models', () => {
    const cost = typicalActionCostUsd('tailor_resume')
    expect(cost).toBeGreaterThan(0.05)
    expect(cost).toBeLessThan(0.5)
  })

  it('never retries paid SDK or tailor calls', () => {
    expect(AI_SDK_MAX_RETRIES).toBe(0)
    expect(TAILOR_MAX_RETRIES).toBe(0)
    expect(TAILOR_MAX_AI_CALLS).toBe(1)
  })

  it('formats small per-request prices with extra digits', () => {
    expect(formatUsd(0.004)).toBe('$0.0040')
    expect(formatUsd(0.015228)).toBe('$0.015')
    expect(formatUsd(1.2)).toBe('$1.20')
  })
})

describe('extractTokenUsage', () => {
  it('reads AI SDK usage fields', () => {
    expect(extractTokenUsage({ inputTokens: 10, outputTokens: 4 })).toEqual({
      inputTokens: 10,
      outputTokens: 4,
    })
  })

  it('treats missing usage as zero', () => {
    expect(extractTokenUsage(undefined)).toEqual({ inputTokens: 0, outputTokens: 0 })
  })
})
