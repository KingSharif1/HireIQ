export type ExtensionSettings = {
  apiBaseUrl: string
  /** Legacy hiq_ token — still accepted by the API. */
  token: string
  /** Supabase access JWT from Google sign-in. */
  accessToken: string
  refreshToken: string
  expiresAt: number
  userEmail: string
}

const DEFAULTS: ExtensionSettings = {
  apiBaseUrl: 'http://localhost:3000',
  token: '',
  accessToken: '',
  refreshToken: '',
  expiresAt: 0,
  userEmail: '',
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
    apiBaseUrl: (stored.apiBaseUrl as string) || DEFAULTS.apiBaseUrl,
    token: (stored.token as string) || DEFAULTS.token,
    accessToken: (stored.accessToken as string) || DEFAULTS.accessToken,
    refreshToken: (stored.refreshToken as string) || DEFAULTS.refreshToken,
    expiresAt: typeof stored.expiresAt === 'number' ? stored.expiresAt : DEFAULTS.expiresAt,
    userEmail: (stored.userEmail as string) || DEFAULTS.userEmail,
  }
}

export async function saveSettings(partial: Partial<ExtensionSettings>) {
  await chrome.storage.sync.set(partial)
}

/** Prefer Google session JWT; fall back to legacy hiq_ token. */
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
