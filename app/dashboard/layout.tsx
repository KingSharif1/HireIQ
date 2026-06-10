import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/queries'
import { Sidebar } from '@/components/shared/Sidebar'
import { MobileNav } from '@/components/shared/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await getProfile(supabase, user.id)

  return (
    <div className="min-h-screen bg-navy-900">
      <Sidebar profile={profile} />
      <main className="md:ml-60 min-h-screen pb-20 md:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
