import type {
  ApplicationEmailLogEntry,
  ApplicationStatus,
  ApplicationTrackerItem,
} from '@/types'
import { normalizeEmailEntry, type InboxMessage } from '@/lib/applications/email'

export type OutreachItem = InboxMessage & {
  applicationId: string | null
  jobId: string | null
  jobTitle: string
  company: string
  applicationStatus: ApplicationStatus | null
}

export type UnmatchedInboundRow = {
  id: string
  from_address: string | null
  subject: string | null
  body_preview: string | null
  created_at: string
}

/** Flatten every application's email_log into one newest-first feed. */
export function buildOutreachFeed(
  items: readonly Pick<
    ApplicationTrackerItem,
    'id' | 'job_id' | 'status' | 'email_log' | 'job'
  >[],
  unmatched: readonly UnmatchedInboundRow[] = [],
): OutreachItem[] {
  const rows: OutreachItem[] = []
  for (const app of items) {
    const log = Array.isArray(app.email_log) ? app.email_log : []
    for (const raw of log) {
      const message = normalizeEmailEntry(raw)
      rows.push({
        ...message,
        applicationId: app.id,
        jobId: app.job_id,
        jobTitle: app.job.title,
        company: app.job.company,
        applicationStatus: app.status,
      })
    }
  }

  for (const row of unmatched) {
    const message = normalizeEmailEntry({
      id: row.id,
      subject: row.subject?.trim() || '(No subject)',
      body: row.body_preview ?? undefined,
      snippet: row.body_preview ?? undefined,
      direction: 'received',
      at: row.created_at,
      sender: row.from_address ?? undefined,
      source: 'masked',
      isRead: false,
    })
    const host = row.from_address?.split('@')[1]?.trim() || 'Inbox'
    rows.push({
      ...message,
      applicationId: null,
      jobId: null,
      jobTitle: 'Not linked to a job',
      company: host,
      applicationStatus: null,
    })
  }

  return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

export function filterOutreachFeed(
  rows: readonly OutreachItem[],
  opts: {
    query?: string
    direction?: ApplicationEmailLogEntry['direction'] | 'all'
  }
): OutreachItem[] {
  const q = opts.query?.trim().toLowerCase() ?? ''
  const direction = opts.direction ?? 'all'
  return rows.filter(row => {
    if (direction !== 'all' && row.direction !== direction) return false
    if (!q) return true
    return (
      row.subject.toLowerCase().includes(q) ||
      row.company.toLowerCase().includes(q) ||
      row.jobTitle.toLowerCase().includes(q) ||
      (row.preview?.toLowerCase().includes(q) ?? false) ||
      (row.sender?.toLowerCase().includes(q) ?? false)
    )
  })
}
