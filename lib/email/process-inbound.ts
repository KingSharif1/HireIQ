import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  extractRecipientEmails,
  normalizeMaskedRecipient,
} from '@/lib/email/masked-address'
import { linkInboundEmailForUser } from '@/lib/email/link-inbound'

export type ResendReceivedEvent = {
  type: string
  created_at?: string
  data: {
    email_id: string
    created_at?: string
    from: string
    to: string[]
    subject?: string
    message_id?: string
    attachments?: unknown[]
  }
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not configured')
  return new Resend(key)
}

function snippetFromBodies(text?: string | null, html?: string | null): string {
  const raw = (text || html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return raw.length > 280 ? `${raw.slice(0, 277).trimEnd()}…` : raw
}

async function maybeForward(opts: {
  to: string
  fromLabel: string
  subject: string
  text: string
}): Promise<string | null> {
  const from = process.env.RESEND_FORWARD_FROM?.trim()
  if (!from) return null
  const resend = getResend()
  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject.startsWith('[HireIQ]') ? opts.subject : `[HireIQ] ${opts.subject}`,
    text:
      `Forwarded employer email (via HireIQ masked inbox).\n` +
      `Original from: ${opts.fromLabel}\n\n` +
      `${opts.text || '(no text body)'}`,
  })
  if (error) {
    console.error('[inbound] forward failed', error)
    return null
  }
  return data?.id ?? null
}

/**
 * Process a verified Resend `email.received` event.
 * Idempotent on provider=resend + provider_message_id.
 */
export async function processResendInbound(event: ResendReceivedEvent): Promise<{
  ok: boolean
  reason?: string
  eventId?: string
}> {
  if (event.type !== 'email.received') {
    return { ok: true, reason: 'ignored_type' }
  }

  const emailId = event.data.email_id
  if (!emailId) return { ok: false, reason: 'missing_email_id' }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('inbound_email_events')
    .select('id')
    .eq('provider', 'resend')
    .eq('provider_message_id', emailId)
    .maybeSingle()
  if (existing) return { ok: true, reason: 'duplicate', eventId: existing.id }

  // Fallback for pre-017 rows keyed only on resend_email_id
  const { data: legacy } = await admin
    .from('inbound_email_events')
    .select('id')
    .eq('resend_email_id', emailId)
    .maybeSingle()
  if (legacy) return { ok: true, reason: 'duplicate', eventId: legacy.id }

  const recipients = extractRecipientEmails(event.data.to)
  if (recipients.length === 0) return { ok: false, reason: 'no_recipients' }

  let user: {
    id: string
    email: string | null
    masked_email: string | null
    email_forward_to: string | null
    email_forward_enabled: boolean | null
  } | null = null

  for (const r of recipients) {
    const { data } = await admin
      .from('profiles')
      .select('id, email, masked_email, email_forward_to, email_forward_enabled')
      .ilike('masked_email', r)
      .maybeSingle()
    if (data) {
      user = data
      break
    }
  }

  if (!user?.masked_email) {
    console.warn('[inbound] no profile for', recipients)
    return { ok: true, reason: 'unknown_recipient' }
  }

  const resend = getResend()
  const received = await resend.emails.receiving.get(emailId)
  if (received.error) {
    console.error('[inbound] fetch body failed', received.error)
  }

  const subject = received.data?.subject ?? event.data.subject ?? '(No subject)'
  const fromAddress = received.data?.from ?? event.data.from ?? ''
  const text = received.data?.text ?? ''
  const html = received.data?.html ?? ''
  const bodyPreview = snippetFromBodies(text, html)
  const at = event.data.created_at ?? event.created_at ?? new Date().toISOString()

  const linked = await linkInboundEmailForUser({
    userId: user.id,
    email: {
      provider: 'resend',
      providerMessageId: emailId,
      mailbox: normalizeMaskedRecipient(user.masked_email),
      fromAddress,
      toAddresses: recipients,
      subject,
      bodyText: text || undefined,
      bodyPreview,
      messageId: event.data.message_id ?? null,
      at,
      rawMeta: {
        attachmentCount: Array.isArray(event.data.attachments) ? event.data.attachments.length : 0,
      },
    },
  })

  if (!linked.ok || !linked.eventId) return linked

  if (user.email_forward_enabled !== false) {
    const forwardTo = (user.email_forward_to || user.email || '').trim()
    if (forwardTo) {
      const fwdId = await maybeForward({
        to: forwardTo,
        fromLabel: fromAddress,
        subject,
        text: text || bodyPreview,
      })
      if (fwdId) {
        await admin
          .from('inbound_email_events')
          .update({ forwarded_at: new Date().toISOString() })
          .eq('id', linked.eventId)
      }
    }
  }

  return { ok: true, eventId: linked.eventId, reason: linked.reason }
}
