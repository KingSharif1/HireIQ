import type { ApplicationEmailLogEntry } from '@/types'

export type InboxMessage = ApplicationEmailLogEntry & {
  preview: string
  source: NonNullable<ApplicationEmailLogEntry['source']>
}

export type InboxThread = {
  id: string
  subject: string
  messages: InboxMessage[]
  latestAt: string
  preview: string
  unread: boolean
}

function messagePreview(entry: ApplicationEmailLogEntry): string {
  const value = (entry.snippet || entry.body || '').replace(/\s+/g, ' ').trim()
  return value.length > 160 ? `${value.slice(0, 157).trimEnd()}…` : value
}

export function normalizeEmailEntry(entry: ApplicationEmailLogEntry): InboxMessage {
  return {
    ...entry,
    subject: entry.subject.trim() || '(No subject)',
    source: entry.source ?? 'manual',
    preview: messagePreview(entry),
  }
}

export function emailThreadKey(subject: string): string {
  const normalized = subject
    .replace(/^(\s*(re|fw|fwd)\s*:\s*)+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()
  return normalized ? `subject:${normalized}` : 'subject:(no subject)'
}

export function buildInboxThreads(entries: readonly ApplicationEmailLogEntry[]): InboxThread[] {
  const grouped = new Map<string, InboxMessage[]>()

  for (const raw of entries) {
    const message = normalizeEmailEntry(raw)
    const threadId = message.threadId?.trim() || emailThreadKey(message.subject)
    grouped.set(threadId, [...(grouped.get(threadId) ?? []), message])
  }

  return Array.from(grouped, ([id, messages]) => {
    const sorted = [...messages].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
    )
    const latest = sorted[sorted.length - 1]
    return {
      id,
      subject: latest.subject,
      messages: sorted,
      latestAt: latest.at,
      preview: latest.preview,
      unread: sorted.some(message => message.direction === 'received' && message.isRead === false),
    }
  }).sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())
}
