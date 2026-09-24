'use client'

import { Sidebar } from '@/components/shared/Sidebar'
import { MobileNav } from '@/components/shared/MobileNav'
import type { Profile } from '@/types'

interface DashboardShellProps {
  profile: Profile | null
  unreadCount: number
  children: React.ReactNode
}

/** App shell: ink rail + calm workspace surface aligned with HireIQ brand. */
export function DashboardShell({ profile, unreadCount, children }: DashboardShellProps) {
  return (
    <div className="dashboard-app relative min-h-dvh bg-background font-marketing text-foreground">
      <Sidebar profile={profile} unreadCount={unreadCount} />
      <main className="relative min-h-dvh overflow-x-hidden pb-20 md:ml-[232px] md:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
