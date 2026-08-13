import { defaultApiBaseUrl, IS_DEV_BUILD, PROD_APP_URL } from './env'

export type ExtensionSettings = {
  apiBaseUrl: string
  /** Legacy hiq_ token — still accepted by the API. */
  token: string
  /** Supabase access JWT from website connect / Google. */
  accessToken: string
  refreshToken: string
  expiresAt: number
  userEmail: string
}

const DEFAULTS: ExtensionSettings = {
  apiBaseUrl: defaultApiBaseUrl(),
  token: '',
  accessToken: '',
  refreshToken: '',
  expiresAt: 0,
  userEmail: '',
}

function resolveApiBaseUrl(stored: unknown): string {
  const value = typeof stored === 'string' ? stored.trim() : ''
  // Production Store builds always talk to prod — ignore stale localhost from older installs.
  if (!IS_DEV_BUILD) return PROD_APP_URL
  return value || DEFAULTS.apiBaseUrl
}

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get([
    'apiBaseUrl',
    'token',
    'accessToken',
    'refreshToken',
    'expiresAt',
    'userEmail',
  ])
  return {
    apiBaseUrl: resolveApiBaseUrl(stored.apiBaseUrl),
    token: (stored.token as string) || DEFAULTS.token,
    accessToken: (stored.accessToken as string) || DEFAULTS.accessToken,
    refreshToken: (stored.refreshToken as string) || DEFAULTS.refreshToken,
    expiresAt: typeof stored.expiresAt === 'number' ? stored.expiresAt : DEFAULTS.expiresAt,
    userEmail: (stored.userEmail as string) || DEFAULTS.userEmail,
  }
}

export async function saveSettings(partial: Partial<ExtensionSettings>) {
  const next = { ...partial }
  if (!IS_DEV_BUILD && next.apiBaseUrl != null) {
    next.apiBaseUrl = PROD_APP_URL
  }
  await chrome.storage.sync.set(next)
}

/** Prefer session JWT; fall back to legacy hiq_ token. */
export async function getBearerToken(): Promise<string> {
  const s = await getSettings()
  if (s.accessToken) return s.accessToken
  return s.token
}

export async function clearSession() {
  await chrome.storage.sync.set({
    accessToken: '',
    refreshToken: '',
    expiresAt: 0,
    userEmail: '',
  })
}

export function isSignedIn(s: ExtensionSettings): boolean {
  return Boolean(s.accessToken || s.token)
}
