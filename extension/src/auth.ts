import { getSettings, saveSettings, clearSession } from './settings'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

export type AuthSession = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  email: string
}

function parseHashParams(url: string): URLSearchParams {
  const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : ''
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : ''
  // Supabase may return tokens in hash or query
  return new URLSearchParams(hash || query)
}

async function fetchUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
    },
  })
  if (!res.ok) return ''
  const json = (await res.json()) as { email?: string }
  return json.email || ''
}

/**
 * Google sign-in via Supabase OAuth + chrome.identity.launchWebAuthFlow.
 * Requires the extension redirect URL in Supabase Auth → Redirect URLs:
 *   https://<EXTENSION_ID>.chromiumapp.org/
 */
export async function signInWithGoogle(): Promise<AuthSession> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase config in extension build')
  }

  const redirectUri = chrome.identity.getRedirectURL()
  const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`)
  url.searchParams.set('provider', 'google')
  url.searchParams.set('redirect_to', redirectUri)

  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: url.toString(), interactive: true }, result => {
      if (chrome.runtime.lastError || !result) {
        reject(new Error(chrome.runtime.lastError?.message || 'Sign-in cancelled'))
        return
      }
      resolve(result)
    })
  })

  const params = parseHashParams(responseUrl)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const expiresIn = Number(params.get('expires_in') || '3600')
  const error = params.get('error_description') || params.get('error')

  if (error) throw new Error(error)
  if (!accessToken || !refreshToken) {
    throw new Error(
      `No session returned. Add this redirect URL in Supabase Auth → URL configuration: ${redirectUri}`,
    )
  }

  const email = await fetchUserEmail(accessToken)
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn

  await saveSettings({
    accessToken,
    refreshToken,
    expiresAt,
    userEmail: email,
    token: '', // prefer Google session
  })

  return { accessToken, refreshToken, expiresAt, email }
}

export async function signOut() {
  await clearSession()
}

/** Refresh access token if close to expiry; return a usable Bearer. */
export async function ensureAccessToken(): Promise<string> {
  const s = await getSettings()
  if (s.accessToken) {
    const now = Math.floor(Date.now() / 1000)
    if (s.expiresAt > now + 60) return s.accessToken

    if (s.refreshToken) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ refresh_token: s.refreshToken }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        access_token?: string
        refresh_token?: string
        expires_in?: number
        error_description?: string
      }
      if (res.ok && json.access_token) {
        const expiresAt = Math.floor(Date.now() / 1000) + (json.expires_in || 3600)
        await saveSettings({
          accessToken: json.access_token,
          refreshToken: json.refresh_token || s.refreshToken,
          expiresAt,
        })
        return json.access_token
      }
    }
  }

  if (s.token) return s.token
  throw new Error('Connect HireIQ from the popup first')
}

/** Exchange a one-time website connect code for a session. */
export async function exchangeWebsiteConnectCode(
  code: string,
  apiBaseUrl: string,
): Promise<AuthSession> {
  const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/extension/connect/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const json = (await res.json().catch(() => ({}))) as {
    error?: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    email?: string | null
  }
  if (!res.ok || !json.accessToken || !json.refreshToken) {
    throw new Error(json.error || `Connect failed (${res.status})`)
  }

  const session: AuthSession = {
    accessToken: json.accessToken,
    refreshToken: json.refreshToken,
    expiresAt: json.expiresAt || Math.floor(Date.now() / 1000) + 3600,
    email: json.email || '',
  }

  await saveSettings({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    userEmail: session.email,
    token: '',
    apiBaseUrl: apiBaseUrl.replace(/\/$/, '') || 'http://localhost:3000',
  })

  return session
}

export async function openWebsiteConnect(apiBaseUrl: string) {
  const base = apiBaseUrl.replace(/\/$/, '') || 'http://localhost:3000'
  const ext = chrome.runtime.id
  const url = `${base}/extension/connect?ext=${encodeURIComponent(ext)}`
  await chrome.tabs.create({ url })
}
