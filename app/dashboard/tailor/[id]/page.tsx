import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Standalone tailored-result page → full-page application detail.
 */
export default async function TailoredResultRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tailored } = await supabase
    .from('tailored_resumes')
    .select('job_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single<{ job_id: string }>()

  if (!tailored?.job_id) notFound()

  redirect(`/dashboard/tracker/${tailored.job_id}`)
}
