'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Bell, CheckCheck, Sparkles, UserPlus, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { notificationTypeLabel } from '@/lib/notifications'
import type { Notification, NotificationType } from '@/types'

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  suggestion: UserPlus,
  tailor_complete: Sparkles,
  email_status: Mail,
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

interface Props {
  initialNotifications: Notification[]
  initialUnreadCount: number
}

export function NotificationsList({ initialNotifications, initialUnreadCount }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function markRead(ids: string[]) {
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) return
    const data = await res.json() as { unreadCount: number }
    setUnreadCount(data.unreadCount)
    setItems(prev =>
      prev.map(n => (ids.includes(n.id) ? { ...n, read: true } : n))
    )
  }

  async function markAllRead() {
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    })
    if (!res.ok) return
    const data = await res.json() as { unreadCount: number }
    setUnreadCount(data.unreadCount)
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function openNotification(notification: Notification) {
    setBusyId(notification.id)
    if (!notification.read) {
      await markRead([notification.id])
    }
    if (notification.link) {
      router.push(notification.link)
    }
    setBusyId(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : 'You’re all caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tailor a job to get started — we’ll nudge you when suggestions are ready.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(notification => {
            const Icon = TYPE_ICONS[notification.type] ?? Bell
            return (
              <li key={notification.id}>
                <button
                  type="button"
                  disabled={busyId === notification.id}
                  onClick={() => void openNotification(notification)}
                  className={cn(
                    'w-full text-left rounded-xl border px-4 py-3 transition-colors',
                    'hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    notification.read
                      ? 'border-border bg-card opacity-80'
                      : 'border-brand-purple/30 bg-brand-purple/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        notification.read ? 'bg-secondary' : 'bg-brand-purple/15'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4',
                          notification.read ? 'text-muted-foreground' : 'text-brand-purple'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-brand-purple flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {notificationTypeLabel(notification.type)} · {formatWhen(notification.created_at)}
                      </p>
                      {notification.body && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
