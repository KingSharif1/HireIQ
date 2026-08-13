import { createAdminClient } from '@/lib/supabase/admin'
import { refreshGoogleAccessToken } from '@/lib/google/gmail'
import type { GoogleConnectionRow } from '@/lib/google/types'

export async function ensureAccessTokenForUser(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: connection } = await admin
    .from('google_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<GoogleConnectionRow>()

  if (!connection?.refresh_token) return null

  const expiresAt = connection.token_expires_at ? Date.parse(connection.token_expires_at) : 0
  if (connection.access_token && expiresAt - Date.now() > 60_000) {
    return connection.access_token
  }

  const refreshed = await refreshGoogleAccessToken(connection.refresh_token)
  const tokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  await admin
    .from('google_connections')
    .update({
      access_token: refreshed.access_token,
      token_expires_at: tokenExpiresAt,
      token_scopes: refreshed.scope ?? connection.token_scopes,
    })
    .eq('user_id', userId)

  return refreshed.access_token
}
