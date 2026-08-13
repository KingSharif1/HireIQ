const GOOGLE_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'

/** Restricted scope — production needs Google verification / CASA at scale. */
export const GOOGLE_GMAIL_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ')

export const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state'

export function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? 'http://localhost:3000'
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/google/callback`

  return { clientId, clientSecret, redirectUri }
}

export function isGoogleOAuthConfigured(): boolean {
  const { clientId, clientSecret } = googleOAuthConfig()
  return Boolean(clientId && clientSecret)
}

export function buildGoogleAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = googleOAuthConfig()
  if (!clientId) throw new Error('Google OAuth is not configured')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_GMAIL_SCOPES,
    state,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  })

  return `${GOOGLE_AUTHORIZE}?${params.toString()}`
}

export interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
  token_type: string
  id_token?: string
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = googleOAuthConfig()
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured')
  }

  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const data = (await res.json()) as GoogleTokenResponse & { error?: string; error_description?: string }
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? 'Failed to exchange Google code')
  }

  return data
}

export function mapGoogleConnectError(code: string | null): string | null {
  switch (code) {
    case 'not_configured':
      return 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local.'
    case 'denied':
      return 'Google authorization was cancelled.'
    case 'state_mismatch':
      return 'Google sign-in expired. Try Connect again.'
    case 'exchange_failed':
      return 'Could not complete Google authorization. Check the OAuth client redirect URI.'
    case 'missing_refresh':
      return 'Google did not return a refresh token. Disconnect in Google Account permissions and try again.'
    default:
      return code ? 'Google connection failed. Try again.' : null
  }
}
