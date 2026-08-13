import { describe, it, expect } from 'vitest'
import { extractVerificationCode } from '@/lib/email/otp-extract'

describe('extractVerificationCode', () => {
  it('extracts code from common phrasing', () => {
    expect(extractVerificationCode('Your verification code is 482913')).toBe('482913')
    expect(extractVerificationCode('Enter code 1234 to verify')).toBe('1234')
  })

  it('returns null when no code present', () => {
    expect(extractVerificationCode('Thanks for applying')).toBeNull()
  })
})
