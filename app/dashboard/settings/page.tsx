import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { SettingsPage } from '@/components/settings/SettingsPage'

export const dynamic = 'force-dynamic'

export default async function DashboardSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  )
}
