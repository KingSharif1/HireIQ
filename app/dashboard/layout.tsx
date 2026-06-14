import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getUnreadNotificationCount } from '@/lib/supabase/queries'
import { DashboardShell } from '@/components/shared/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, unreadRes] = await Promise.all([
    getProfile(supabase, user.id),
    getUnreadNotificationCount(supabase, user.id),
  ])
  const unreadCount = unreadRes.error ? 0 : (unreadRes.count ?? 0)

  return (
    <DashboardShell profile={profile} unreadCount={unreadCount}>
      {children}
    </DashboardShell>
  )
}
