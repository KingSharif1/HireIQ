import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JobHub } from '@/components/jobs/JobHub'
import type { Job, TailoredResume } from '@/types'

export const dynamic = 'force-dynamic'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single<Job>()

  if (!job) notFound()

  const { data: versions } = await supabase
    .from('tailored_resumes')
    .select('*')
    .eq('job_id', id)
    .eq('user_id', user.id)
    .order('version', { ascending: false })
    .returns<TailoredResume[]>()

  return <JobHub job={job} versions={versions ?? []} />
}
