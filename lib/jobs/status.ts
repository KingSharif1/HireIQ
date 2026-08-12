import type { ApplicationStatus, TailoringStatus } from '@/types'

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'bookmarked', label: 'Bookmarked' },
  { value: 'applying', label: 'Applying' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'offer', label: 'Offer' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
]

/** Normalize legacy status values from older rows / clients. */
export function normalizeApplicationStatus(status: string | null | undefined): ApplicationStatus {
  if (status === 'not_applied' || !status) return 'bookmarked'
  if (APPLICATION_STATUSES.some(s => s.value === status)) {
    return status as ApplicationStatus
  }
  return 'bookmarked'
}

export function applicationStatusLabel(status: ApplicationStatus | string): string {
  const normalized = normalizeApplicationStatus(status)
  return APPLICATION_STATUSES.find(s => s.value === normalized)?.label ?? 'Bookmarked'
}

/** Tailwind text+bg classes for an application status pill. */
export function applicationStatusClasses(status: ApplicationStatus | string): string {
  switch (normalizeApplicationStatus(status)) {
    case 'applying':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'applied':
      return 'bg-blue-500/15 text-blue-500 border-blue-500/30'
    case 'interviewing':
      return 'bg-violet-500/15 text-violet-500 border-violet-500/30'
    case 'negotiating':
      return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
    case 'offer':
    case 'accepted':
      return 'bg-brand-green/15 text-brand-green border-brand-green/30'
    case 'rejected':
      return 'bg-destructive/15 text-destructive border-destructive/30'
    default:
      return 'bg-secondary text-muted-foreground border-border'
  }
}

export function tailoringStatusLabel(status: TailoringStatus): string {
  switch (status) {
    case 'tailored':
      return 'Tailored'
    case 'in_progress':
      return 'In progress'
    default:
      return 'Not started'
  }
}
