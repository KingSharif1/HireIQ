'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { MobileNav } from '@/components/shared/MobileNav'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const STORAGE_KEY = 'hireiq:sidebar-collapsed'

interface DashboardShellProps {
  profile: Profile | null
  unreadCount: number
  children: React.ReactNode
}

export function DashboardShell({ profile, unreadCount, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // localStorage isn't available during SSR, so we read it after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    setHydrated(true)
  }, [])

  function toggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        profile={profile}
        unreadCount={unreadCount}
        collapsed={collapsed}
        onToggle={toggle}
      />
      <main
        className={cn(
          'min-h-screen pb-20 md:pb-0',
          // Avoid layout flash before hydration by matching the default (expanded).
          hydrated ? (collapsed ? 'md:ml-[4.5rem]' : 'md:ml-60') : 'md:ml-60',
          'transition-[margin] duration-200 ease-in-out'
        )}
      >
        {children}
      </main>
      <MobileNav unreadCount={unreadCount} />
    </div>
  )
}
