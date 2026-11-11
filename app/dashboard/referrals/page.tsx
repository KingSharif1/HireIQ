import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { ReferralsPage } from '@/components/referrals/ReferralsPage'
import type { LinkedInConnection, ReferralStage } from '@/types'

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

  const { data: outreachRows } = await supabase
    .from('referral_outreach')
    .select('id, connection_id, stage, message_draft, asked_at, replied_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(500)

  const outreach = (outreachRows ?? []).map((r) => ({
    id: r.id as string,
    connectionId: (r.connection_id as string | null) ?? null,
    stage: r.stage as ReferralStage,
    messageDraft: (r.message_draft as string | null) ?? null,
    askedAt: (r.asked_at as string | null) ?? null,
    repliedAt: (r.replied_at as string | null) ?? null,
    updatedAt: r.updated_at as string,
  }))

  return (
    <Suspense fallback={null}>
      <ReferralsPage connections={connections} outreach={outreach} />
    </Suspense>
  )
}
