import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ApplicationEmailLogEntry } from '@/types'
import {
  extractRecipientEmails,
  normalizeMaskedRecipient,
} from '@/lib/email/masked-address'
import {
  inferStatusFromEmail,
  matchInboundToJob,
  type JobMatchCandidate,
} from '@/lib/email/inbound-match'
import type { NotificationInsert } from '@/lib/notifications'

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

async function loadOpenApplications(userId: string): Promise<JobMatchCandidate[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('applications')
    .select('id, job_id, status, job:jobs!inner(id, company, title)')
    .eq('user_id', userId)
    .not('status', 'in', '(accepted,rejected)')
    .order('updated_at', { ascending: false })
    .limit(80)

  const rows: JobMatchCandidate[] = []
  for (const row of data ?? []) {
    const job = Array.isArray(row.job) ? row.job[0] : row.job
    if (!job || typeof job !== 'object') continue
    rows.push({
      applicationId: row.id as string,
      jobId: (job as { id: string }).id,
      company: (job as { company?: string }).company ?? '',
      title: (job as { title?: string }).title ?? '',
    })
  }
  return rows
}

async function appendToEmailLog(opts: {
  userId: string
  applicationId: string
  entry: ApplicationEmailLogEntry
}): Promise<void> {
  const admin = createAdminClient()
  const { data: app } = await admin
    .from('applications')
    .select('email_log')
    .eq('id', opts.applicationId)
    .eq('user_id', opts.userId)
    .maybeSingle()

  const previous = Array.isArray(app?.email_log) ? app.email_log : []
  if (previous.some((e: { id?: string }) => e?.id === opts.entry.id)) return

  const next = [...previous, opts.entry].slice(-200)
  const { error } = await admin
    .from('applications')
    .update({ email_log: next, updated_at: new Date().toISOString() })
    .eq('id', opts.applicationId)
    .eq('user_id', opts.userId)

  if (error) throw error

  await admin.from('application_events').insert({
    application_id: opts.applicationId,
    user_id: opts.userId,
    event_type: 'email_linked',
    meta: {
      emailId: opts.entry.id,
      subject: opts.entry.subject,
      direction: opts.entry.direction,
      source: opts.entry.source ?? 'masked',
    },
    created_at: opts.entry.at,
  })
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
 * Idempotent on resend_email_id.
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
    .eq('resend_email_id', emailId)
    .maybeSingle()
  if (existing) return { ok: true, reason: 'duplicate', eventId: existing.id }

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
  const hint = inferStatusFromEmail(subject, bodyPreview)

  const candidates = await loadOpenApplications(user.id)
  const matched = matchInboundToJob(candidates, {
    from: fromAddress,
    subject,
    bodyPreview,
  })

  const logEntryId = `masked_${emailId}`
  const entry: ApplicationEmailLogEntry = {
    id: logEntryId,
    subject,
    body: text || bodyPreview || undefined,
    direction: 'received',
    at,
    sender: fromAddress,
    recipients: [normalizeMaskedRecipient(user.masked_email)],
    snippet: bodyPreview,
    messageId: event.data.message_id,
    source: 'masked',
    isRead: false,
  }

  if (matched) {
    await appendToEmailLog({
      userId: user.id,
      applicationId: matched.match.applicationId,
      entry,
    })
  }

  const { data: inserted, error: insertError } = await admin
    .from('inbound_email_events')
    .insert({
      user_id: user.id,
      application_id: matched?.match.applicationId ?? null,
      job_id: matched?.match.jobId ?? null,
      masked_email: user.masked_email,
      resend_email_id: emailId,
      message_id: event.data.message_id ?? null,
      from_address: fromAddress,
      to_addresses: recipients,
      subject,
      body_preview: bodyPreview,
      parsed_status: hint?.status ?? null,
      confidence: hint?.confidence ?? null,
      raw_meta: {
        matchScore: matched?.score ?? null,
        hintReason: hint?.reason ?? null,
        attachmentCount: Array.isArray(event.data.attachments) ? event.data.attachments.length : 0,
      },
      created_at: at,
    })
    .select('id')
    .single()

  if (insertError) {
    // Unique race on resend_email_id
    if (insertError.code === '23505') {
      return { ok: true, reason: 'duplicate' }
    }
    throw insertError
  }

  let forwardedAt: string | null = null
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
        forwardedAt = new Date().toISOString()
        await admin
          .from('inbound_email_events')
          .update({ forwarded_at: forwardedAt })
          .eq('id', inserted.id)
      }
    }
  }

  const link = matched
    ? `/dashboard/tracker/${matched.match.jobId}?tab=email`
    : '/dashboard/tracker?view=outreach'

  const notification: NotificationInsert = {
    user_id: user.id,
    type: 'email_status',
    title: matched
      ? `Email from ${matched.match.company || 'employer'}`
      : 'New application email',
    body: subject,
    link,
    ref_id: inserted.id,
  }
  await admin.from('notifications').insert(notification)

  return { ok: true, eventId: inserted.id }
}
