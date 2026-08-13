import { describe, it, expect } from 'vitest'
import { overlayApplyEmail, resolveApplyIdentity } from '@/lib/extension/apply-identity'

describe('resolveApplyIdentity', () => {
  it('allows account creation with gmail mode when connected', () => {
    const id = resolveApplyIdentity({
      mode: 'gmail',
      profileEmail: 'user@gmail.com',
      maskedEmail: null,
      gmailConnected: true,
    })
    expect(id.canCreateAccount).toBe(true)
    expect(id.applyEmail).toBe('user@gmail.com')
    expect(id.primaryAction).toBe('create-and-continue')
  })

  it('uses masked email in masked mode', () => {
    const id = resolveApplyIdentity({
      mode: 'masked',
      profileEmail: 'user@gmail.com',
      maskedEmail: 'apply@mail.example.com',
      gmailConnected: false,
    })
    expect(id.applyEmail).toBe('apply@mail.example.com')
    expect(id.canCreateAccount).toBe(true)
  })

  it('overlays masked apply email onto the autofill profile', () => {
    const profile = overlayApplyEmail(
      { email: 'user@gmail.com', firstName: 'Sharif' },
      'sharif.apply@mail.example.com',
    )
    expect(profile.email).toBe('sharif.apply@mail.example.com')
    expect(profile.firstName).toBe('Sharif')
  })

  it('blocks account creation when tracking is off', () => {
    const id = resolveApplyIdentity({
      mode: 'off',
      profileEmail: 'user@gmail.com',
      maskedEmail: 'apply@mail.example.com',
      gmailConnected: true,
    })
    expect(id.canCreateAccount).toBe(false)
    expect(id.primaryAction).toBe('autofill-only')
  })
})
