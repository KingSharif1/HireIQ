import type {
  ApplicationEmailLogEntry,
  ApplicationStatus,
  ApplicationTrackerItem,
} from '@/types'
import { normalizeEmailEntry, type InboxMessage } from '@/lib/applications/email'

export type OutreachItem = InboxMessage & {
  applicationId: string
  jobId: string
  jobTitle: string
  company: string
  applicationStatus: ApplicationStatus
}

/** Flatten every application's email_log into one newest-first feed. */
export function buildOutreachFeed(
  items: readonly Pick<
    ApplicationTrackerItem,
    'id' | 'job_id' | 'status' | 'email_log' | 'job'
  >[]
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
