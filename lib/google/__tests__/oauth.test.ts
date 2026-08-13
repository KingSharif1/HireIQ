import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  buildGoogleAuthorizeUrl,
  mapGoogleConnectError,
  isGoogleOAuthConfigured,
  GOOGLE_GMAIL_SCOPES,
} from '@/lib/google/oauth'

describe('google oauth', () => {
  const env = process.env

  beforeEach(() => {
    process.env = {
      ...env,
      GOOGLE_CLIENT_ID: 'test-google-client',
      GOOGLE_CLIENT_SECRET: 'test-google-secret',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    }
  })

  afterEach(() => {
    process.env = env
  })

  it('builds authorize url with gmail.readonly and offline access', () => {
    const url = buildGoogleAuthorizeUrl('state-abc')
    expect(url).toContain('accounts.google.com/o/oauth2/v2/auth')
    expect(url).toContain('client_id=test-google-client')
    expect(url).toContain('state=state-abc')
    expect(url).toContain('access_type=offline')
    expect(url).toContain('prompt=consent')
    expect(url).toContain(encodeURIComponent('gmail.readonly').replace(/%2F/g, '%2F'))
    expect(decodeURIComponent(url)).toContain('gmail.readonly')
    expect(GOOGLE_GMAIL_SCOPES).toContain('gmail.readonly')
  })

  it('detects configured oauth', () => {
    expect(isGoogleOAuthConfigured()).toBe(true)
    delete process.env.GOOGLE_CLIENT_SECRET
    expect(isGoogleOAuthConfigured()).toBe(false)
  })

  it('maps connect errors', () => {
    expect(mapGoogleConnectError('not_configured')).toMatch(/GOOGLE_CLIENT_ID/)
    expect(mapGoogleConnectError('denied')).toMatch(/cancelled/)
    expect(mapGoogleConnectError('missing_refresh')).toMatch(/refresh token/)
    expect(mapGoogleConnectError(null)).toBeNull()
  })
})
