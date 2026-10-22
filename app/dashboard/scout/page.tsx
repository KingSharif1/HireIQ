import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ScoutDeck } from '@/components/scout/ScoutDeck'
import { AddJobs } from '@/components/scout/AddJobs'
import type { ScoutLead } from '@/components/scout/types'

export const metadata = { title: 'Scout' }

export default async function ScoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('job_leads')
    .select('id, source, source_url, apply_url, title, company, location, remote, fit_score, fit_reasons, deal_breakers, status, liveness, liveness_reason, apply_vendor, apply_verdict, apply_notes, safety_blocked, checked_at, job_id, created_at')
    .eq('user_id', user.id)
    .eq('status', 'new')
    .order('fit_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Scout</h1>
        <p className="mt-1 text-sm text-muted-foreground">Jobs found for you. Keep the ones you want and HireIQ starts tailoring your resume.</p>
        <div className="mt-4">
          <AddJobs />
        </div>
      </header>
      <ScoutDeck key={(data ?? []).map(l => l.id).join(',')} initialLeads={(data ?? []) as ScoutLead[]} />
    </div>
  )
}
