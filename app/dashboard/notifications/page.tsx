import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNotifications, getUnreadNotificationCount } from '@/lib/supabase/queries'
import { sortNotificationsUnreadFirst } from '@/lib/notifications'
import { NotificationsList } from '@/components/notifications/NotificationsList'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: notifications, error }, { count }] = await Promise.all([
    getNotifications(supabase, user.id),
    getUnreadNotificationCount(supabase, user.id),
  ])

  if (error) {
    const missingTable = error.message?.includes('notifications') || error.code === '42P01'
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Notifications</h1>
        {missingTable ? (
          <div className="rounded-xl border border-brand-amber/30 bg-brand-amber/10 p-4 text-sm text-foreground space-y-2">
            <p className="font-medium">Database setup required</p>
            <p className="text-muted-foreground">
              Run <code className="text-xs bg-secondary px-1 py-0.5 rounded">docs/supabase/migrations/004_notifications.sql</code> in
              your Supabase SQL editor, then refresh this page.
            </p>
          </div>
        ) : (
          <p className="text-sm text-destructive">Could not load notifications.</p>
        )}
      </div>
    )
  }

  return (
    <NotificationsList
      initialNotifications={sortNotificationsUnreadFirst(notifications ?? [])}
      initialUnreadCount={count ?? 0}
    />
  )
}
