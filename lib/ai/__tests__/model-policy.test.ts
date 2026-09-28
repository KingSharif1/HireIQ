import { describe, expect, it } from 'vitest'
import { AI_MODELS, effectiveModels, tierForFeature } from '@/lib/ai/models'

describe('effectiveModels', () => {
  it('ignores user overrides on HireIQ key — we pick the models', () => {
    expect(
      effectiveModels('hireiq', { strong: 'claude-haiku-4-5-20251001', fast: 'claude-sonnet-5' })
    ).toEqual({ strong: AI_MODELS.strong, fast: AI_MODELS.fast })
  })

  it('honors allowed user overrides on BYOK', () => {
    expect(
      effectiveModels('byok', { strong: 'claude-haiku-4-5-20251001', fast: 'claude-haiku-4-5-20251001' })
    ).toEqual({ strong: 'claude-haiku-4-5-20251001', fast: 'claude-haiku-4-5-20251001' })
  })

  it('falls back to defaults for disallowed BYOK overrides', () => {
    expect(effectiveModels('byok', { strong: 'gpt-4', fast: null })).toEqual({
      strong: AI_MODELS.strong,
      fast: AI_MODELS.fast,
    })
  })

  it('falls back to defaults when BYOK has no overrides', () => {
    expect(effectiveModels('byok')).toEqual({ strong: AI_MODELS.strong, fast: AI_MODELS.fast })
  })
})

describe('tierForFeature', () => {
  it('routes evidence and writing work to strong, drafts to fast', () => {
    expect(tierForFeature('tailor_resume')).toBe('strong')
    expect(tierForFeature('tailor_critique')).toBe('strong')
    expect(tierForFeature('repo_intelligence')).toBe('strong')
    expect(tierForFeature('autofill_draft')).toBe('fast')
  })
})
