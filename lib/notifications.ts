import type { Notification, NotificationType, PendingSuggestionSection } from '@/types'

export type { Notification, NotificationType }

export interface NotificationInsert {
  user_id: string
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
  ref_id?: string | null
}

/** Sprout-style cap for sidebar badge */
export function formatUnreadCount(count: number): string {
  if (count <= 0) return ''
  if (count > 99) return '99+'
  return String(count)
}

export function profileSectionLink(section: PendingSuggestionSection): string {
  return `/dashboard/profile?section=${section}`
}

export function buildTailorCompleteNotification(
  userId: string,
  jobLabel: string,
  tailoredResumeId: string
): NotificationInsert {
  return {
    user_id: userId,
    type: 'tailor_complete',
    title: `Resume tailored for ${jobLabel}`,
    body: 'Your job-specific resume is ready to review and export.',
    link: `/dashboard/tailor/${tailoredResumeId}`,
    ref_id: tailoredResumeId,
  }
}

export function buildSuggestionNotification(
  userId: string,
  jobLabel: string,
  tailoredResumeId: string,
  count: number,
  section: PendingSuggestionSection = 'experience'
): NotificationInsert {
  const noun = count === 1 ? 'suggestion' : 'suggestions'
  return {
    user_id: userId,
    type: 'suggestion',
    title: `${count} profile ${noun} from ${jobLabel}`,
    body: 'Review and accept new bullets for your master profile.',
    link: profileSectionLink(section),
    ref_id: tailoredResumeId,
  }
}

/** True when no pending suggestions remain for a tailor run */
export function pendingClearedForTailorRun(
  pending: { sourceTailoredResumeId: string }[],
  tailoredResumeId: string
): boolean {
  return !pending.some(p => p.sourceTailoredResumeId === tailoredResumeId)
}

export function notificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'suggestion':
      return 'Profile suggestion'
    case 'tailor_complete':
      return 'Tailor complete'
    case 'email_status':
      return 'Email update'
    default:
      return 'Notification'
  }
}

export function sortNotificationsUnreadFirst(items: Notification[]): Notification[] {
  return [...items].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}
