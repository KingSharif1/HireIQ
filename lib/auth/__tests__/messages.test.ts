import { describe, it, expect } from 'vitest'
import { authErrorMessage, mapSupabaseAuthError, parseAuthNames } from '@/lib/auth/messages'

describe('auth messages', () => {
  it('maps known error codes', () => {
    expect(authErrorMessage('auth_failed')).toContain('Sign-in failed')
  })

  it('maps Supabase invalid credentials', () => {
    expect(mapSupabaseAuthError('Invalid login credentials')).toContain('incorrect')
  })

  it('parses OAuth full name into first/last', () => {
    const names = parseAuthNames({ full_name: 'Jane Doe' })
    expect(names.firstName).toBe('Jane')
    expect(names.lastName).toBe('Doe')
  })

  it('parses email signup metadata', () => {
    const names = parseAuthNames({ first_name: 'Alex', last_name: 'Kim' })
    expect(names.fullName).toBe('Alex Kim')
  })
})
