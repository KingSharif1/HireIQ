import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { linkInboundEmailForUser } from '@/lib/email/link-inbound'
import {
  getGmailMessage,
  getGmailProfile,
  listGmailHistoryChanges,
  listGmailMessages,
  looksLikeNoiseGmail,
  refreshGoogleAccessToken,
} from './gmail'
import type { GoogleConnectionRow } from './types'

async function ensureAccessToken(
  admin: SupabaseClient,
  connection: GoogleConnectionRow,
): Promise<string> {
  const expiresAt = connection.token_expires_at ? Date.parse(connection.token_expires_at) : 0
  const stillValid =
    connection.access_token && expiresAt && expiresAt - Date.now() > 60_000

  if (stillValid && connection.access_token) {
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
    .eq('user_id', connection.user_id)

  return refreshed.access_token
}

export type GmailSyncResult = {
  scanned: number
  linked: number
  matched: number
  skipped: number
  duplicates: number
  errors: string[]
  /** Whether this run used Gmail History API vs full list scan. */
  mode?: 'history' | 'full'
}

async function processGmailMessageIds(
  accessToken: string,
  messageIds: string[],
  userId: string,
  mailbox: string,
  result: GmailSyncResult,
): Promise<string | null> {
  let latestHistoryId: string | null = null

  for (const messageId of messageIds) {
    result.scanned += 1
    try {
      const msg = await getGmailMessage(accessToken, messageId)
      if (msg.historyId) latestHistoryId = msg.historyId
      if (looksLikeNoiseGmail(msg, mailbox)) {
        result.skipped += 1
        continue
      }

      const linked = await linkInboundEmailForUser({
        userId,
        notify: true,
        email: {
          provider: 'gmail',
          providerMessageId: msg.id,
          mailbox,
          fromAddress: msg.from,
          toAddresses: msg.to.length ? msg.to : [mailbox],
          subject: msg.subject,
          bodyText: msg.bodyText || undefined,
          bodyPreview: msg.snippet,
          messageId: msg.messageId,
          at: msg.internalDate
            ? new Date(Number(msg.internalDate)).toISOString()
            : new Date().toISOString(),
          rawMeta: { threadId: msg.threadId },
        },
      })

      if (linked.reason === 'duplicate') {
        result.duplicates += 1
        continue
      }
      if (linked.ok) {
        result.linked += 1
        if (linked.matched) result.matched += 1
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : 'message_failed')
    }
  }

  return latestHistoryId
}

export async function syncGmailForUser(userId: string): Promise<GmailSyncResult> {
  const admin = createAdminClient()
  const result: GmailSyncResult = {
    scanned: 0,
    linked: 0,
    matched: 0,
    skipped: 0,
    duplicates: 0,
    errors: [],
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('gmail_sync_enabled, email_tracking_mode')
    .eq('id', userId)
    .maybeSingle<{ gmail_sync_enabled: boolean | null; email_tracking_mode: string | null }>()

  if (profile?.email_tracking_mode === 'off' || profile?.email_tracking_mode === 'masked') {
    return { ...result, errors: ['opted_out'] }
  }

  if (profile?.gmail_sync_enabled === false) {
    return { ...result, errors: ['opted_out'] }
  }

  const { data: connection } = await admin
    .from('google_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<GoogleConnectionRow>()

  if (!connection?.refresh_token) {
    return { ...result, errors: ['not_connected'] }
  }

  let accessToken: string
  try {
    accessToken = await ensureAccessToken(admin, connection)
  } catch (e) {
    return {
      ...result,
      errors: [e instanceof Error ? e.message : 'token_refresh_failed'],
    }
  }

  const mailbox = connection.google_email

  let listed: { id: string; threadId: string }[] = []
  let latestHistoryId: string | null = connection.history_id
  let syncMode: GmailSyncResult['mode'] = 'full'

  if (connection.history_id) {
    try {
      const history = await listGmailHistoryChanges(accessToken, connection.history_id)
      if (!history.expired) {
        syncMode = 'history'
        if (history.latestHistoryId) latestHistoryId = history.latestHistoryId
        if (history.messageIds.length > 0) {
          const msgHistoryId = await processGmailMessageIds(
            accessToken,
            history.messageIds,
            userId,
            mailbox,
            result,
          )
          if (msgHistoryId) latestHistoryId = msgHistoryId
        }
        result.mode = syncMode
        await admin
          .from('google_connections')
          .update({
            synced_at: new Date().toISOString(),
            history_id: latestHistoryId,
          })
          .eq('user_id', userId)
        return result
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : 'history_failed')
    }
  }

  try {
    listed = await listGmailMessages(accessToken, { maxResults: 40 })
  } catch (e) {
    return {
      ...result,
      errors: [e instanceof Error ? e.message : 'list_failed'],
    }
  }

  const messageIds = listed.map(item => item.id)
  const msgHistoryId = await processGmailMessageIds(
    accessToken,
    messageIds,
    userId,
    mailbox,
    result,
  )
  if (msgHistoryId) latestHistoryId = msgHistoryId

  if (!latestHistoryId) {
    try {
      const gmailProfile = await getGmailProfile(accessToken)
      latestHistoryId = gmailProfile.historyId
    } catch {
      // keep null — next sync will full-scan again
    }
  }

  result.mode = syncMode

  await admin
    .from('google_connections')
    .update({
      synced_at: new Date().toISOString(),
      history_id: latestHistoryId,
    })
    .eq('user_id', userId)

  return result
}

export async function syncGmailForAllEnabledUsers(limit = 50): Promise<{
  users: number
  results: { userId: string; result: GmailSyncResult }[]
}> {
  const admin = createAdminClient()
  const { data: connections } = await admin
    .from('google_connections')
    .select('user_id')
    .limit(limit)

  const results: { userId: string; result: GmailSyncResult }[] = []
  for (const row of connections ?? []) {
    const userId = row.user_id as string
    const result = await syncGmailForUser(userId)
    results.push({ userId, result })
  }
  return { users: results.length, results }
}
