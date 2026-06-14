'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { formatUnreadCount } from '@/lib/notifications'

export function useUnreadNotifications(initialCount = 0) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(initialCount)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/notifications?countOnly=true')
        if (!res.ok || cancelled) return
        const data = await res.json() as { unreadCount: number }
        if (!cancelled) setUnreadCount(data.unreadCount)
      } catch {
        // badge is non-critical
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [pathname])

  return { unreadCount, badgeLabel: formatUnreadCount(unreadCount) }
}
