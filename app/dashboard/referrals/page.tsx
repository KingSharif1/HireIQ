import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { ReferralsPage } from '@/components/referrals/ReferralsPage'
import type { LinkedInConnection } from '@/types'

export const dynamic = 'force-dynamic'

export default async function DashboardReferralsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('linkedin_connections')
    .select('id, user_id, first_name, last_name, url, company, position, email, connected_on, source, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500)

  const connections: LinkedInConnection[] = (rows ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    firstName: r.first_name ?? '',
    lastName: r.last_name ?? '',
    url: r.url ?? '',
    company: r.company ?? '',
    position: r.position ?? '',
    email: r.email ?? undefined,
    connectedOn: r.connected_on ?? undefined,
    source: r.source as 'csv' | 'oauth',
    createdAt: r.created_at,
  }))

  return (
    <Suspense fallback={null}>
      <ReferralsPage connections={connections} />
    </Suspense>
  )
}
