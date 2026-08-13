import { googleOAuthConfig } from './oauth'

export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
  scope?: string
}> {
  const { clientId, clientSecret } = googleOAuthConfig()
  if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = (await res.json()) as {
    access_token?: string
    expires_in?: number
    scope?: string
    error?: string
    error_description?: string
  }

  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? 'Failed to refresh Google token')
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in ?? 3600,
    scope: data.scope,
  }
}

export type GmailListedMessage = {
  id: string
  threadId: string
}

export type GmailParsedMessage = {
  id: string
  threadId: string
  historyId?: string
  internalDate?: string
  from: string
  to: string[]
  subject: string
  snippet: string
  bodyText: string
  messageId: string | null
}

function headerMap(headers: { name: string; value: string }[] | undefined): Map<string, string> {
  const map = new Map<string, string>()
  for (const h of headers ?? []) {
    map.set(h.name.toLowerCase(), h.value)
  }
  return map
}

function parseAddressList(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(part => {
      const m = part.match(/<([^>]+)>/)
      return (m?.[1] ?? part).trim().toLowerCase()
    })
    .filter(Boolean)
}

function decodeBodyData(data?: string): string {
  if (!data) return ''
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return Buffer.from(normalized, 'base64').toString('utf8')
  } catch {
    return ''
  }
}

function extractTextFromPayload(payload: {
  mimeType?: string
  body?: { data?: string }
  parts?: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }[]
}): string {
  if (!payload) return ''
  if (payload.mimeType?.startsWith('text/plain') && payload.body?.data) {
    return decodeBodyData(payload.body.data)
  }
  for (const part of payload.parts ?? []) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBodyData(part.body.data)
    }
  }
  for (const part of payload.parts ?? []) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return decodeBodyData(part.body.data).replace(/<[^>]+>/g, ' ')
    }
  }
  if (payload.body?.data) return decodeBodyData(payload.body.data)
  return ''
}

export async function listGmailMessages(
  accessToken: string,
  opts?: { query?: string; maxResults?: number },
): Promise<GmailListedMessage[]> {
  const params = new URLSearchParams({
    maxResults: String(opts?.maxResults ?? 40),
    q: opts?.query ?? 'newer_than:14d -in:chats -category:promotions -category:social',
  })
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await res.json()) as {
    messages?: GmailListedMessage[]
    error?: { message?: string }
  }
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Gmail list failed (${res.status})`)
  }
  return data.messages ?? []
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string,
): Promise<GmailParsedMessage> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const data = (await res.json()) as {
    id: string
    threadId: string
    historyId?: string
    internalDate?: string
    snippet?: string
    payload?: {
      mimeType?: string
      headers?: { name: string; value: string }[]
      body?: { data?: string }
      parts?: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }[]
    }
    error?: { message?: string }
  }
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Gmail get failed (${res.status})`)
  }

  const headers = headerMap(data.payload?.headers)
  const bodyText = extractTextFromPayload(data.payload ?? {}).replace(/\s+/g, ' ').trim()
  const snippet = (data.snippet || bodyText).replace(/\s+/g, ' ').trim()

  return {
    id: data.id,
    threadId: data.threadId,
    historyId: data.historyId,
    internalDate: data.internalDate,
    from: headers.get('from') ?? '',
    to: parseAddressList(headers.get('to')),
    subject: headers.get('subject') ?? '(No subject)',
    snippet: snippet.length > 280 ? `${snippet.slice(0, 277).trimEnd()}…` : snippet,
    bodyText,
    messageId: headers.get('message-id') ?? null,
  }
}

/** Skip mail that is almost certainly not employer ATS/status. */
export function looksLikeNoiseGmail(msg: GmailParsedMessage, mailbox: string): boolean {
  const from = msg.from.toLowerCase()
  const mailboxLower = mailbox.toLowerCase()
  if (from.includes(mailboxLower)) return true
  if (/\b(noreply@linkedin|notifications@github|no-reply@accounts\.google)\b/i.test(from)) {
    return true
  }
  const subj = msg.subject.toLowerCase()
  if (subj.startsWith('re: ') && !/\b(interview|offer|application|position|role)\b/i.test(subj)) {
    // Keep most replies; only filter empty/noise later via matcher
  }
  return false
}
