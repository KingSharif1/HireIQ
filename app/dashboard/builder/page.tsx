import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BuilderHome } from '@/components/builder/BuilderHome'
import { loadProfileWorkspaceData } from '@/lib/profile/load-workspace'
import type { LibraryTailoredRow } from '@/components/builder/ResumeLibrary'

export const dynamic = 'force-dynamic'

/** Resume Builder — master editor + files/versions on one surface. */
export default async function BuilderLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; jobId?: string; section?: string; view?: string }>
}) {
  const params = await searchParams
  if (params.jobId) {
    redirect(`/dashboard/tracker/${params.jobId}?tab=documents`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const view = params.view === 'files' || params.view === 'library' ? 'files' : 'master'

  const [{ profile, initialData, resumes, githubData }, tailoredRes] = await Promise.all([
    loadProfileWorkspaceData(user.id),
    supabase
      .from('tailored_resumes')
      .select('id, job_id, version, tailored_score, match_score, created_at, jobs(title, company, apply_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  type TailoredJoin = {
    id: string
    job_id: string
    version: number
    tailored_score: number | null
    match_score: number | null
    created_at: string
    jobs:
      | { title: string | null; company: string | null; apply_url: string | null }
      | { title: string | null; company: string | null; apply_url: string | null }[]
      | null
  }

  const tailoredRaw: LibraryTailoredRow[] = ((tailoredRes.data ?? []) as TailoredJoin[]).map(row => {
    const job = Array.isArray(row.jobs) ? row.jobs[0] ?? null : row.jobs
    return {
      id: row.id,
      job_id: row.job_id,
      version: row.version,
      tailored_score: row.tailored_score,
      match_score: row.match_score,
      created_at: row.created_at,
      job_title: job?.title ?? null,
      company: job?.company ?? null,
      apply_url: job?.apply_url ?? null,
    }
  })

  const seenJobs = new Set<string>()
  const tailored = tailoredRaw.filter(row => {
    if (seenJobs.has(row.job_id)) return false
    seenJobs.add(row.job_id)
    return true
  })

  return (
    <Suspense fallback={null}>
      <BuilderHome
        view={view}
        userId={user.id}
        initialData={initialData}
        profile={profile}
        resumes={resumes}
        githubData={githubData}
        libraryResumes={resumes}
        tailored={tailored}
      />
    </Suspense>
  )
}
