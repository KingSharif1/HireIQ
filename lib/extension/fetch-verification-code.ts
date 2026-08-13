import { createAdminClient } from '@/lib/supabase/admin'
import { extractVerificationCode } from '@/lib/email/otp-extract'
import { ensureAccessTokenForUser } from '@/lib/google/token-access'
import { getGmailMessage, listGmailMessages } from '@/lib/google/gmail'

export type VerificationCodeResult = {
  code: string | null
  source: 'gmail' | 'masked' | null
  subject?: string
  receivedAt?: string
}

function sinceIso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

async function pollGmailVerificationCode(userId: string, mailbox: string): Promise<VerificationCodeResult> {
  const accessToken = await ensureAccessTokenForUser(userId)
  if (!accessToken) return { code: null, source: null }

  const messages = await listGmailMessages(accessToken, {
    query: 'newer_than:1d (verification OR code OR confirm OR otp)',
    maxResults: 15,
  })

  for (const listed of messages) {
    const msg = await getGmailMessage(accessToken, listed.id)
    const hay = `${msg.subject}\n${msg.snippet}\n${msg.bodyText}`
    if (!/\b(code|verification|verify|otp|confirm)\b/i.test(hay)) continue
    const code = extractVerificationCode(hay)
    if (code) {
      return {
        code,
        source: 'gmail',
        subject: msg.subject,
        receivedAt: msg.internalDate
          ? new Date(Number(msg.internalDate)).toISOString()
          : undefined,
      }
    }
  }

  return { code: null, source: null }
}

async function pollMaskedVerificationCode(userId: string): Promise<VerificationCodeResult> {
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('inbound_email_events')
    .select('subject, body_preview, created_at')
    .eq('user_id', userId)
    .gte('created_at', sinceIso(30))
    .order('created_at', { ascending: false })
    .limit(20)

  for (const row of rows ?? []) {
    const hay = `${row.subject ?? ''}\n${row.body_preview ?? ''}`
    if (!/\b(code|verification|verify|otp|confirm)\b/i.test(hay)) continue
    const code = extractVerificationCode(hay)
    if (code) {
      return {
        code,
        source: 'masked',
        subject: row.subject ?? undefined,
        receivedAt: row.created_at ?? undefined,
      }
    }
  }

  return { code: null, source: null }
}

export async function fetchVerificationCodeForUser(
  userId: string,
  mode: 'gmail' | 'masked' | 'off',
  profileEmail: string,
): Promise<VerificationCodeResult> {
  if (mode === 'off') return { code: null, source: null }
  if (mode === 'masked') return pollMaskedVerificationCode(userId)
  return pollGmailVerificationCode(userId, profileEmail)
}
