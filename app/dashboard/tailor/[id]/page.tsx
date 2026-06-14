import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * The standalone tailored-result page has been merged into the Job Hub
 * (/dashboard/jobs/[jobId]), which is now the single home for a job's
 * documents, fit score, questions, and timeline. We resolve the tailored
 * resume's job and redirect there so old links keep working.
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

  redirect(`/dashboard/jobs/${tailored.job_id}`)
}
