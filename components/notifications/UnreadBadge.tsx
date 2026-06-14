'use client'

import { cn } from '@/lib/utils'
import { formatUnreadCount } from '@/lib/notifications'
import { useUnreadNotifications } from './useUnreadNotifications'

interface Props {
  initialCount?: number
  className?: string
}

export function UnreadBadge({ initialCount = 0, className }: Props) {
  const { badgeLabel } = useUnreadNotifications(initialCount)
  const label = badgeLabel || formatUnreadCount(initialCount)
  if (!label) return null

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-1 rounded-full',
        'bg-brand-amber text-[10px] font-bold text-background leading-none',
        'animate-in fade-in zoom-in-95 duration-200',
        className
      )}
    >
      {label}
    </span>
  )
}
