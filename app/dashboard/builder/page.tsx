import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BuilderHome } from '@/components/builder/BuilderHome'
import { loadProfileWorkspaceData } from '@/lib/profile/load-workspace'
import { profilePath } from '@/lib/profile/paths'
import type { LibraryTailoredRow } from '@/components/builder/ResumeLibrary'

export const dynamic = 'force-dynamic'

/** Resume Builder — uploads + tailored versions by job. Master lives on Profile. */
export default async function BuilderLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; jobId?: string; section?: string; view?: string }>
}) {
  const params = await searchParams
  if (params.jobId) {
    redirect(`/dashboard/tracker/${params.jobId}?tab=documents`)
  }
  if (params.view === 'master' || params.section) {
    redirect(profilePath(params.section ?? 'personal'))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ resumes }, tailoredRes] = await Promise.all([
    loadProfileWorkspaceData(user.id),
    supabase
      .from('tailored_resumes')
      .select('id, job_id, version, tailored_score, match_score, created_at, jobs(title, company, apply_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80),
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

  const tailored: LibraryTailoredRow[] = ((tailoredRes.data ?? []) as TailoredJoin[]).map(row => {
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

  return (
    <Suspense fallback={null}>
      <BuilderHome libraryResumes={resumes} tailored={tailored} />
    </Suspense>
  )
}
