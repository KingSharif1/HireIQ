import { createAdminClient } from '@/lib/supabase/admin'
import { extractSavableJobUrl } from '@/lib/email/extract-job-urls'
import { normalizeMaskedRecipient } from '@/lib/email/masked-address'
import { saveJobFromUrl, UnsavableJobUrlError } from '@/lib/jobs/save-from-url'
import type { NotificationInsert } from '@/lib/notifications'

export async function processForwardedJobEmail(opts: {
  userId: string
  mailbox: string
  emailId: string
  fromAddress: string
  toAddresses: string[]
  subject: string
  text: string
  html: string
  bodyPreview: string
  messageId?: string | null
  at: string
}): Promise<{ ok: boolean; reason: string; eventId?: string; jobId?: string }> {
  const admin = createAdminClient()
  const mailbox = normalizeMaskedRecipient(opts.mailbox)
  const jobUrl = extractSavableJobUrl(
    `${opts.subject}\n${opts.text}`,
    opts.html,
  )

  let jobId: string | null = null
  let reason = 'no_job_url'
  let title = opts.subject || 'Forwarded job'

  if (jobUrl) {
    try {
      const saved = await saveJobFromUrl({
        userId: opts.userId,
        url: jobUrl,
        source: 'email',
        title: opts.subject || undefined,
        description: opts.text || opts.bodyPreview || undefined,
      })
      jobId = saved.jobId
      title = saved.title
      reason = saved.existing ? 'existing_job' : 'saved_job'
    } catch (err) {
      reason = err instanceof UnsavableJobUrlError ? 'unsavable_url' : 'save_failed'
      console.error('[forward-save] save failed', err)
    }
  }

  const { data: inserted, error } = await admin
    .from('inbound_email_events')
    .insert({
      user_id: opts.userId,
      application_id: null,
      job_id: jobId,
      masked_email: mailbox,
      resend_email_id: opts.emailId,
      provider: 'resend',
      provider_message_id: opts.emailId,
      message_id: opts.messageId ?? null,
      from_address: opts.fromAddress,
      to_addresses: opts.toAddresses,
      subject: opts.subject,
      body_preview: opts.bodyPreview,
      parsed_status: null,
      confidence: null,
      raw_meta: {
        kind: 'forward_save',
        jobUrl,
        reason,
      },
      created_at: opts.at,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: true, reason: 'duplicate', jobId: jobId ?? undefined }
    }
    throw error
  }

  const notification: NotificationInsert = {
    user_id: opts.userId,
    type: 'email_status',
    title: jobId ? `Saved to tracker: ${title}` : 'Job email received — no link found',
    body: jobId
      ? 'Forwarded posting is in Applications. Open it to tailor a resume.'
      : 'We got the email but could not find a job URL. Paste the posting into Applications instead.',
    link: jobId ? `/dashboard/tracker/${jobId}` : '/dashboard/jobs',
    ref_id: inserted.id,
  }
  await admin.from('notifications').insert(notification)

  return { ok: true, reason, eventId: inserted.id, jobId: jobId ?? undefined }
}
