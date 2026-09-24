'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { MobileNav } from '@/components/shared/MobileNav'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface DashboardShellProps {
  profile: Profile | null
  unreadCount: number
  children: React.ReactNode
}

/** App shell: ink rail + calm workspace surface aligned with HireIQ brand. */
export function DashboardShell({ profile, unreadCount, children }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="dashboard-app relative min-h-dvh bg-background font-marketing text-foreground">
      <Sidebar
        profile={profile}
        unreadCount={unreadCount}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(value => !value)}
      />
      <main
        className={cn(
          'relative min-h-dvh overflow-x-hidden pb-20 transition-[margin] duration-200 md:pb-0',
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[232px]',
        )}
      >
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
