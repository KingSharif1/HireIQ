/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { fillSignupForm, fillVerificationCode } from '@/lib/extension/agentic-signup'

describe('agentic-signup', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('fills email and password fields', () => {
    document.body.innerHTML = `
      <input type="email" name="email" />
      <input type="password" name="password" />
      <input type="password" name="confirm" />
    `
    const filled = fillSignupForm(document, {
      email: 'user@gmail.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: 'SecretPass123!',
    })
    expect(filled).toContain('email')
    expect(filled).toContain('password')
    expect((document.querySelector('input[type="email"]') as HTMLInputElement).value).toBe(
      'user@gmail.com',
    )
  })

  it('fills verification code input', () => {
    document.body.innerHTML = `<input name="verification_code" />`
    expect(fillVerificationCode(document, '123456')).toBe(true)
    expect((document.querySelector('input') as HTMLInputElement).value).toBe('123456')
  })
})
