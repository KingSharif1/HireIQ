import { afterEach, describe, expect, it } from 'vitest'
import { encryptSecret, readStoredSecret } from '@/lib/crypto/secret'

const ORIGINAL_SECRET = process.env.AI_KEY_ENCRYPTION_SECRET

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.AI_KEY_ENCRYPTION_SECRET
  else process.env.AI_KEY_ENCRYPTION_SECRET = ORIGINAL_SECRET
})

describe('readStoredSecret', () => {
  it('round-trips a password and still reads legacy plaintext', () => {
    process.env.AI_KEY_ENCRYPTION_SECRET = 'hireiq-test-encryption-secret'
    const cipher = encryptSecret('portal-secret-1')
    expect(cipher).not.toContain('portal-secret-1')
    expect(readStoredSecret(cipher)).toBe('portal-secret-1')
    expect(readStoredSecret('legacy-plaintext')).toBe('legacy-plaintext')
    expect(readStoredSecret('')).toBe('')
  })
})
