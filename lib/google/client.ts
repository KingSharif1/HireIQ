export interface GoogleUserInfo {
  id: string
  email: string
  verified_email?: boolean
  name?: string
  picture?: string
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await res.json()) as GoogleUserInfo & { error?: { message?: string } }
  if (!res.ok || !data.email) {
    throw new Error(data.error?.message ?? 'Failed to load Google user info')
  }
  return data
}
