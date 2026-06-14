'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Sparkles, Home, UserCircle, Bell } from 'lucide-react'
import { UnreadBadge } from '@/components/notifications/UnreadBadge'

const NAV_ITEMS: {
  href: string
  icon: typeof Home
  label: string
  badge?: boolean
}[] = [
  { href: '/dashboard', icon: Home, label: 'Apps' },
  { href: '/dashboard/notifications', icon: Bell, label: 'Alerts', badge: true },
  { href: '/dashboard/tailor', icon: Sparkles, label: 'Tailor' },
  { href: '/dashboard/profile', icon: UserCircle, label: 'Profile' },
] as const

interface MobileNavProps {
  unreadCount?: number
}

export function MobileNav({ unreadCount = 0 }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2 safe-bottom">
        {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg min-w-[52px] transition-colors relative',
                active ? 'text-brand-purple' : 'text-muted-foreground'
              )}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {badge && (
                  <span className="absolute -top-1 -right-2">
                    <UnreadBadge initialCount={unreadCount} className="scale-90" />
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
