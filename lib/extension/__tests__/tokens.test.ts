import { describe, expect, it } from 'vitest'
import {
  generateExtensionToken,
  hashExtensionToken,
} from '@/lib/extension/tokens'

describe('extension tokens', () => {
  it('generates hiq_ prefixed tokens', () => {
    const a = generateExtensionToken()
    const b = generateExtensionToken()
    expect(a.startsWith('hiq_')).toBe(true)
    expect(b.startsWith('hiq_')).toBe(true)
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(20)
  })

  it('hashes deterministically and trims', () => {
    const token = 'hiq_test_token_value'
    expect(hashExtensionToken(token)).toBe(hashExtensionToken(` ${token} `))
    expect(hashExtensionToken(token)).toMatch(/^[a-f0-9]{64}$/)
    expect(hashExtensionToken(token)).not.toBe(hashExtensionToken(token + 'x'))
  })
})
