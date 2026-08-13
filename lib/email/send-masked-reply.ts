import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { appendToEmailLog } from '@/lib/email/link-inbound'
import { normalizeMaskedRecipient } from '@/lib/email/masked-address'
import type { ApplicationEmailLogEntry } from '@/types'

export class MaskedReplyError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message)
    this.name = 'MaskedReplyError'
  }
}

/** Pull bare email from `Name <addr@x.com>` or plain address. */
export function extractBareEmail(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const angle = trimmed.match(/<([^>]+)>/)
  const candidate = (angle?.[1] ?? trimmed).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return null
  return candidate
}

export function replySubject(original: string): string {
  const trimmed = original.trim() || '(No subject)'
  return /^re\s*:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`
}

function snippet(text: string): string {
  const raw = text.replace(/\s+/g, ' ').trim()
  return raw.length > 280 ? `${raw.slice(0, 277).trimEnd()}…` : raw
}

function displayFrom(opts: {
  maskedEmail: string
  firstName?: string | null
  lastName?: string | null
}): string {
  const name = [opts.firstName, opts.lastName].filter(Boolean).join(' ').trim()
  return name ? `${name} <${opts.maskedEmail}>` : opts.maskedEmail
}

/**
 * Send a reply as the user's HireIQ application email (Task 140).
 * From = masked address (domain must be verified for sending on Resend).
 */
export async function sendMaskedApplicationReply(opts: {
  userId: string
  applicationId: string
  body: string
  /** Defaults to last received message's sender. */
  to?: string
  subject?: string
  /** Message being replied to (for In-Reply-To). */
  inReplyToId?: string
}): Promise<{ entry: ApplicationEmailLogEntry; resendId: string }> {
  const body = opts.body.trim()
  if (!body) throw new MaskedReplyError('Message body is required')
  if (body.length > 50_000) throw new MaskedReplyError('Message is too long')

  const admin = createAdminClient()

  const { data: app, error: appError } = await admin
    .from('applications')
    .select('id, user_id, email_log, job_id')
    .eq('id', opts.applicationId)
    .eq('user_id', opts.userId)
    .maybeSingle()

  if (appError || !app) throw new MaskedReplyError('Application not found', 404)

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select(
      'masked_email, email_tracking_mode, first_name, last_name, email',
    )
    .eq('id', opts.userId)
    .maybeSingle()

  if (profileError || !profile) throw new MaskedReplyError('Profile not found', 404)

  const masked = profile.masked_email?.trim()
  if (!masked) {
    throw new MaskedReplyError(
      'Create an application email in Settings before replying through HireIQ.',
      400,
    )
  }
  if (profile.email_tracking_mode !== 'masked') {
    throw new MaskedReplyError(
      'Switch Job email tracking to Application email in Settings to reply through HireIQ.',
      400,
    )
  }

  const log = Array.isArray(app.email_log) ? (app.email_log as ApplicationEmailLogEntry[]) : []
  const replyTarget = opts.inReplyToId
    ? log.find(e => e.id === opts.inReplyToId)
    : [...log].reverse().find(e => e.direction === 'received')

  const toRaw = opts.to?.trim() || replyTarget?.sender || ''
  const to = extractBareEmail(toRaw)
  if (!to) throw new MaskedReplyError('Could not determine who to reply to')

  // Don't let users email themselves via a typo into the masked inbox
  if (normalizeMaskedRecipient(to) === normalizeMaskedRecipient(masked)) {
    throw new MaskedReplyError('Choose the employer address to reply to')
  }

  const subject = replySubject(
    opts.subject?.trim() || replyTarget?.subject || 'Your application',
  ).slice(0, 500)

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new MaskedReplyError('Email sending is not configured', 503)

  const resend = new Resend(apiKey)
  const from = displayFrom({
    maskedEmail: masked,
    firstName: profile.first_name,
    lastName: profile.last_name,
  })

  const headers: Record<string, string> = {}
  if (replyTarget?.messageId) {
    headers['In-Reply-To'] = replyTarget.messageId
    headers.References = replyTarget.messageId
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    text: body,
    replyTo: masked,
    headers: Object.keys(headers).length ? headers : undefined,
  })

  if (error || !data?.id) {
    console.error('[masked-reply] send failed', error)
    throw new MaskedReplyError(
      error?.message || 'Failed to send email. Confirm mail.kingsharif.com can send via Resend.',
      502,
    )
  }

  const at = new Date().toISOString()
  const entry: ApplicationEmailLogEntry = {
    id: `masked_sent_${data.id}`,
    subject,
    body,
    direction: 'sent',
    at,
    sender: masked,
    recipients: [to],
    snippet: snippet(body),
    messageId: data.id,
    threadId: replyTarget?.threadId,
    source: 'masked',
    isRead: true,
  }

  await appendToEmailLog({
    userId: opts.userId,
    applicationId: opts.applicationId,
    entry,
  })

  return { entry, resendId: data.id }
}
