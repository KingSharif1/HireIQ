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
    <div className="dashboard-app relative min-h-dvh bg-[hsl(210_28%_97%)] font-marketing text-foreground dark:bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(900px 420px at 12% -8%, rgba(13,148,136,0.09), transparent 55%), radial-gradient(700px 380px at 100% 0%, rgba(15,23,42,0.04), transparent 50%)',
        }}
      />
      <Sidebar profile={profile} unreadCount={unreadCount} />
      <main className="relative min-h-dvh overflow-x-hidden pb-20 md:ml-[68px] md:pb-0">
        {children}
      </main>
      <MobileNav profile={profile} unreadCount={unreadCount} />
    </div>
  )
}
