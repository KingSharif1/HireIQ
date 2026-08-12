import { applicationStatusLabel } from '@/lib/jobs/status'
import type { ApplicationEmailLogEntry, ApplicationEvent } from '@/types'

export type ActivityItem = {
  id: string
  title: string
  detail?: string
  at: string
  kind: 'status' | 'email' | 'created' | 'note' | 'other'
}

function metaString(meta: Record<string, unknown>, key: string): string | undefined {
  const value = meta[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function timelineLabel(event: ApplicationEvent): string {
  if (event.event_type === 'status_change') {
    const from = event.from_status ? applicationStatusLabel(event.from_status) : null
    const to = event.to_status ? applicationStatusLabel(event.to_status) : 'Updated'
    return from ? `${from} → ${to}` : `Status set to ${to}`
  }
  if (event.event_type === 'created') return 'Application created'
  if (event.event_type === 'email_linked') {
    return metaString(event.meta, 'subject') || 'Email linked'
  }
  if (event.event_type === 'note') return metaString(event.meta, 'title') || 'Note added'
  if (event.event_type === 'manual') return metaString(event.meta, 'title') || 'Event added'
  return 'Activity'
}

export function buildActivityFeed(
  events: readonly ApplicationEvent[],
  emails: readonly ApplicationEmailLogEntry[]
): ActivityItem[] {
  const linkedEmailIds = new Set(
    events
      .filter(event => event.event_type === 'email_linked')
      .map(event => metaString(event.meta, 'emailId'))
      .filter((id): id is string => Boolean(id))
  )

  const fromEvents: ActivityItem[] = events.map(event => ({
    id: event.id,
    title: timelineLabel(event),
    detail: metaString(event.meta, 'detail') || metaString(event.meta, 'body'),
    at: event.created_at,
    kind:
      event.event_type === 'status_change'
        ? 'status'
        : event.event_type === 'created'
          ? 'created'
          : event.event_type === 'email_linked'
            ? 'email'
            : event.event_type === 'note'
              ? 'note'
              : 'other',
  }))

  const legacyEmails: ActivityItem[] = emails
    .filter(email => !linkedEmailIds.has(email.id))
    .map(email => ({
      id: `email-${email.id}`,
      title: email.subject,
      detail: email.body,
      at: email.at,
      kind: 'email',
    }))

  return [...fromEvents, ...legacyEmails].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  )
}
