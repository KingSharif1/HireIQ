const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token'
export const GITHUB_OAUTH_SCOPES = 'read:user repo'
export const GITHUB_OAUTH_STATE_COOKIE = 'github_oauth_state'

export function githubOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim()
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? 'http://localhost:3000'
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/github/callback`

  return { clientId, clientSecret, redirectUri }
}

/** GitHub Apps (Iv1.*) reject dynamic scope params — permissions come from app settings. */
export function isGitHubAppClientId(clientId: string): boolean {
  return clientId.startsWith('Iv1.')
}

export function isGitHubOAuthConfigured(): boolean {
  const { clientId, clientSecret } = githubOAuthConfig()
  return Boolean(clientId && clientSecret)
}

export function buildGitHubAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = githubOAuthConfig()
  if (!clientId) throw new Error('GitHub OAuth is not configured')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  })

  // Classic OAuth Apps use scope; GitHub Apps (Iv1.*) 404 if scope is passed.
  if (!isGitHubAppClientId(clientId)) {
    params.set('scope', GITHUB_OAUTH_SCOPES)
  }

  return `${GITHUB_AUTHORIZE}?${params.toString()}`
}

export interface GitHubTokenResponse {
  access_token: string
  scope: string
  token_type: string
}

export async function exchangeGitHubCode(code: string): Promise<GitHubTokenResponse> {
  const { clientId, clientSecret, redirectUri } = githubOAuthConfig()
  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth is not configured')
  }

  const res = await fetch(GITHUB_TOKEN, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })

  const data = (await res.json()) as GitHubTokenResponse & { error?: string; error_description?: string }
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? 'Failed to exchange GitHub code')
  }

  return data
}

export function mapGitHubConnectError(code: string | null): string | null {
  const { redirectUri } = githubOAuthConfig()
  switch (code) {
    case 'not_configured':
      return 'GitHub OAuth is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.'
    case 'denied':
      return 'GitHub authorization was cancelled.'
    case 'state_mismatch':
      return 'GitHub sign-in expired. Try Connect again.'
    case 'exchange_failed':
      return `Could not complete GitHub authorization. In your GitHub OAuth App, set the callback URL exactly to: ${redirectUri}`
    case 'sync_failed':
      return 'GitHub connected but sync failed. Tap Sync to retry.'
    default:
      return code ? 'GitHub connection failed. Try again.' : null
  }
}
