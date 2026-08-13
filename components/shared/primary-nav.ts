import { Briefcase, FileText, Home, type LucideIcon } from 'lucide-react'

/** Primary rail — Resume Builder owns master + files; account menu opens Settings. */
export const PRIMARY_NAV: {
  href: string
  icon: LucideIcon
  label: string
  /** Short label for mobile bottom bar */
  shortLabel: string
  match: (pathname: string) => boolean
}[] = [
  {
    href: '/dashboard',
    icon: Home,
    label: 'Dashboard',
    shortLabel: 'Dashboard',
    match: (p) => p === '/dashboard',
  },
  {
    href: '/dashboard/tracker',
    icon: Briefcase,
    label: 'Applications',
    shortLabel: 'Apps',
    match: (p) =>
      p.startsWith('/dashboard/tracker') ||
      p.startsWith('/dashboard/jobs'),
  },
  {
    href: '/dashboard/builder',
    icon: FileText,
    label: 'Resume Builder',
    shortLabel: 'Builder',
    match: (p) =>
      p.startsWith('/dashboard/builder') ||
      p.startsWith('/dashboard/resume') ||
      p.startsWith('/dashboard/profile'),
  },
]
