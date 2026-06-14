import type { ApplicationStatus, TailoringStatus } from '@/types'

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'not_applied', label: 'Not applied' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
]

export function applicationStatusLabel(status: ApplicationStatus): string {
  return APPLICATION_STATUSES.find(s => s.value === status)?.label ?? 'Not applied'
}

/** Tailwind text+bg classes for an application status pill. */
export function applicationStatusClasses(status: ApplicationStatus): string {
  switch (status) {
    case 'applied':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    case 'interviewing':
      return 'bg-brand-purple/15 text-brand-purple border-brand-purple/30'
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
