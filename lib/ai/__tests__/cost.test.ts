import { describe, expect, it } from 'vitest'
import { estimateTokenCostUsd } from '@/lib/ai/models'
import { extractTokenUsage } from '@/lib/ai/usage'

describe('estimateTokenCostUsd', () => {
  it('prices Haiku 4.5 at $1/$5 per MTok', () => {
    expect(estimateTokenCostUsd('claude-haiku-4-5-20251001', 1_000_000, 1_000_000)).toBe(6)
  })

  it('prices Sonnet 4.6 at $3/$15 per MTok', () => {
    expect(estimateTokenCostUsd('claude-sonnet-4-6', 1_000_000, 0)).toBe(3)
    expect(estimateTokenCostUsd('claude-sonnet-4-6', 0, 1_000_000)).toBe(15)
  })

  it('falls back by prefix for unknown dated ids', () => {
    expect(estimateTokenCostUsd('claude-sonnet-4-6-20250514', 1_000_000, 0)).toBe(3)
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
