import { Home, User, Users, Briefcase, FileText, Compass, type LucideIcon } from 'lucide-react'
import { V2_SURFACES_ENABLED } from '@/lib/features'

/** Primary rail — Profile is master + autofill; Builder is tailored versions. */
export type NavItem = {
  href: string
  icon: LucideIcon
  label: string
  /** Short label for mobile bottom bar */
  shortLabel: string
  match: (pathname: string) => boolean
  /** v2 job-hub surface — hidden unless NEXT_PUBLIC_V2_SURFACES=1. */
  v2?: boolean
}

export const ALL_NAV: NavItem[] = [
  {
    href: '/dashboard',
    icon: Home,
    label: 'Dashboard',
    shortLabel: 'Home',
    match: (p) => p === '/dashboard',
  },
  {
    href: '/dashboard/scout',
    icon: Compass,
    label: 'Scout',
    shortLabel: 'Scout',
    match: (p) => p.startsWith('/dashboard/scout'),
    v2: true,
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
    href: '/dashboard/referrals',
    icon: Users,
    label: 'Referrals',
    shortLabel: 'Refs',
    match: (p) => p.startsWith('/dashboard/referrals'),
    v2: true,
  },
  {
    href: '/dashboard/profile',
    icon: User,
    label: 'Profile',
    shortLabel: 'Profile',
    match: (p) => p.startsWith('/dashboard/profile'),
  },
  {
    href: '/dashboard/builder',
    icon: FileText,
    label: 'Resume Builder',
    shortLabel: 'Builder',
    match: (p) =>
      p.startsWith('/dashboard/builder') ||
      p.startsWith('/dashboard/resume'),
  },
]

export function navFor(v2Enabled: boolean): NavItem[] {
  return ALL_NAV.filter((item) => v2Enabled || !item.v2)
}

/** Primary rail for this build: v1 = Dashboard, Applications, Profile, Resume Builder. */
export const PRIMARY_NAV: NavItem[] = navFor(V2_SURFACES_ENABLED)
