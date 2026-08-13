export interface GoogleConnectionRow {
  user_id: string
  google_email: string
  access_token: string | null
  refresh_token: string
  token_scopes: string | null
  token_expires_at: string | null
  history_id: string | null
  connected_at: string
  synced_at: string | null
}

export type GoogleConnectionStatus =
  | { connected: false; gmailSyncEnabled: boolean; configured: boolean }
  | {
      connected: true
      email: string
      syncedAt: string | null
      gmailSyncEnabled: boolean
      configured: boolean
    }
