import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  buildGitHubAuthorizeUrl,
  mapGitHubConnectError,
  isGitHubOAuthConfigured,
} from '@/lib/github/oauth'

describe('github oauth', () => {
  const env = process.env

  beforeEach(() => {
    process.env = {
      ...env,
      GITHUB_CLIENT_ID: 'test-client-id',
      GITHUB_CLIENT_SECRET: 'test-secret',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    }
  })

  afterEach(() => {
    process.env = env
  })

  it('builds authorize url with scopes and state', () => {
    const url = buildGitHubAuthorizeUrl('state-abc')
    expect(url).toContain('github.com/login/oauth/authorize')
    expect(url).toContain('client_id=test-client-id')
    expect(url).toContain('state=state-abc')
    expect(url).toContain('read%3Auser+repo')
    expect(url).toContain('redirect_uri=')
  })

  it('omits scope for GitHub App client ids (Iv1.*)', () => {
    process.env.GITHUB_CLIENT_ID = 'Iv1.testapp123'
    const url = buildGitHubAuthorizeUrl('state-xyz')
    expect(url).not.toContain('scope=')
    expect(url).toContain('client_id=Iv1.testapp123')
  })

  it('detects configured oauth', () => {
    expect(isGitHubOAuthConfigured()).toBe(true)
    delete process.env.GITHUB_CLIENT_SECRET
    expect(isGitHubOAuthConfigured()).toBe(false)
  })

  it('maps connect errors', () => {
    expect(mapGitHubConnectError('not_configured')).toMatch(/GITHUB_CLIENT_ID/)
    expect(mapGitHubConnectError('denied')).toMatch(/cancelled/)
    expect(mapGitHubConnectError(null)).toBeNull()
  })
})
