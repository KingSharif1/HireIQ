import { createAdminClient } from '@/lib/supabase/admin'
import type { ApplicationEmailLogEntry } from '@/types'
import {
  inferStatusFromEmail,
  matchInboundToJob,
  type JobMatchCandidate,
} from '@/lib/email/inbound-match'
import type { NotificationInsert } from '@/lib/notifications'

export type InboundProvider = 'resend' | 'gmail'

export type NormalizedInboundEmail = {
  provider: InboundProvider
  providerMessageId: string
  mailbox: string
  fromAddress: string
  toAddresses: string[]
  subject: string
  bodyText?: string
  bodyPreview: string
  messageId?: string | null
  at: string
  rawMeta?: Record<string, unknown>
}

export async function loadOpenApplications(userId: string): Promise<JobMatchCandidate[]> {
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

export async function appendToEmailLog(opts: {
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

/**
 * Match + store inbound mail for a known user.
 * Idempotent on (provider, provider_message_id).
 */
export async function linkInboundEmailForUser(opts: {
  userId: string
  email: NormalizedInboundEmail
  /** When false, skip notifications (bulk sync noise). Default true. */
  notify?: boolean
}): Promise<{
  ok: boolean
  reason?: string
  eventId?: string
  matched?: boolean
  score?: number
}> {
  const admin = createAdminClient()
  const { email, userId } = opts
  const notify = opts.notify !== false

  const { data: existing } = await admin
    .from('inbound_email_events')
    .select('id')
    .eq('provider', email.provider)
    .eq('provider_message_id', email.providerMessageId)
    .maybeSingle()
  if (existing) return { ok: true, reason: 'duplicate', eventId: existing.id }

  const hint = inferStatusFromEmail(email.subject, email.bodyPreview)
  const candidates = await loadOpenApplications(userId)
  const matched = matchInboundToJob(candidates, {
    from: email.fromAddress,
    subject: email.subject,
    bodyPreview: email.bodyPreview,
  })

  const logEntryId = `${email.provider}_${email.providerMessageId}`
  const entry: ApplicationEmailLogEntry = {
    id: logEntryId,
    subject: email.subject,
    body: email.bodyText || email.bodyPreview || undefined,
    direction: 'received',
    at: email.at,
    sender: email.fromAddress,
    recipients: email.toAddresses.length ? email.toAddresses : [email.mailbox],
    snippet: email.bodyPreview,
    messageId: email.messageId ?? undefined,
    source: email.provider === 'gmail' ? 'gmail' : 'masked',
    isRead: false,
  }

  if (matched) {
    await appendToEmailLog({
      userId,
      applicationId: matched.match.applicationId,
      entry,
    })
  }

  const { data: inserted, error: insertError } = await admin
    .from('inbound_email_events')
    .insert({
      user_id: userId,
      application_id: matched?.match.applicationId ?? null,
      job_id: matched?.match.jobId ?? null,
      masked_email: email.mailbox,
      resend_email_id: email.provider === 'resend' ? email.providerMessageId : null,
      provider: email.provider,
      provider_message_id: email.providerMessageId,
      message_id: email.messageId ?? null,
      from_address: email.fromAddress,
      to_addresses: email.toAddresses,
      subject: email.subject,
      body_preview: email.bodyPreview,
      parsed_status: hint?.status ?? null,
      confidence: hint?.confidence ?? null,
      raw_meta: {
        matchScore: matched?.score ?? null,
        hintReason: hint?.reason ?? null,
        ...(email.rawMeta ?? {}),
      },
      created_at: email.at,
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return { ok: true, reason: 'duplicate' }
    }
    throw insertError
  }

  if (notify) {
    const link = matched
      ? `/dashboard/tracker/${matched.match.jobId}?tab=email`
      : '/dashboard/tracker?view=outreach'

    const notification: NotificationInsert = {
      user_id: userId,
      type: 'email_status',
      title: matched
        ? `Email from ${matched.match.company || 'employer'}`
        : 'New application email',
      body: email.subject,
      link,
      ref_id: inserted.id,
    }
    await admin.from('notifications').insert(notification)
  }

  return {
    ok: true,
    eventId: inserted.id,
    matched: Boolean(matched),
    score: matched?.score,
  }
}
