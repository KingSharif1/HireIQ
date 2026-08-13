import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoogleConnectionRow, GoogleConnectionStatus } from './types'
import { isGoogleOAuthConfigured } from './oauth'

export async function getGoogleConnection(
  supabase: SupabaseClient,
  userId: string,
): Promise<GoogleConnectionRow | null> {
  const { data } = await supabase
    .from('google_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<GoogleConnectionRow>()
  return data ?? null
}

export async function saveGoogleConnection(
  supabase: SupabaseClient,
  userId: string,
  opts: {
    email: string
    accessToken: string
    refreshToken: string
    scopes?: string | null
    expiresIn?: number
  },
): Promise<void> {
  const expiresAt =
    typeof opts.expiresIn === 'number'
      ? new Date(Date.now() + opts.expiresIn * 1000).toISOString()
      : null

  const { error } = await supabase.from('google_connections').upsert({
    user_id: userId,
    google_email: opts.email,
    access_token: opts.accessToken,
    refresh_token: opts.refreshToken,
    token_scopes: opts.scopes ?? null,
    token_expires_at: expiresAt,
    connected_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function disconnectGoogleAccount(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await supabase.from('google_connections').delete().eq('user_id', userId)
}

export async function getGmailSyncEnabled(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('gmail_sync_enabled')
    .eq('id', userId)
    .maybeSingle<{ gmail_sync_enabled: boolean | null }>()
  return data?.gmail_sync_enabled !== false
}

export async function setGmailSyncEnabled(
  supabase: SupabaseClient,
  userId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      gmail_sync_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function publicGoogleStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<GoogleConnectionStatus> {
  const [connection, gmailSyncEnabled] = await Promise.all([
    getGoogleConnection(supabase, userId),
    getGmailSyncEnabled(supabase, userId),
  ])
  const configured = isGoogleOAuthConfigured()

  if (!connection) {
    return { connected: false, gmailSyncEnabled, configured }
  }

  return {
    connected: true,
    email: connection.google_email,
    syncedAt: connection.synced_at,
    gmailSyncEnabled,
    configured,
  }
}
