'use client'

import { Sidebar } from '@/components/shared/Sidebar'
import { MobileNav } from '@/components/shared/MobileNav'
import type { Profile } from '@/types'

interface DashboardShellProps {
  profile: Profile | null
  unreadCount: number
  children: React.ReactNode
}

/** Teal-style shell: fixed 60px icon rail + full-bleed content. */
export function DashboardShell({ profile, unreadCount, children }: DashboardShellProps) {
  return (
    <div className="min-h-dvh bg-white dark:bg-background">
      <Sidebar profile={profile} unreadCount={unreadCount} />
      <main className="min-h-dvh pb-20 md:pb-0 md:ml-[60px] overflow-x-hidden">
        {children}
      </main>
      <MobileNav profile={profile} unreadCount={unreadCount} />
    </div>
  )
}
