import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResumeLibrary, type LibraryTailoredRow } from '@/components/builder/ResumeLibrary'
import { emptyProfileData } from '@/lib/profile/data'
import { normalizeProfileData } from '@/lib/profile/provenance'
import type { ResumeRow } from '@/lib/profile/resume-row'
import type { ProfileData } from '@/types'

export const dynamic = 'force-dynamic'

/** Resume Builder library — import / list / open job versions. Master edits → Profile. */
export default async function BuilderLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; jobId?: string; section?: string }>
}) {
  const params = await searchParams
  // Legacy deep links that opened the Teal workspace on /builder
  if (params.jobId) {
    redirect(`/dashboard/tracker/${params.jobId}?tab=documents`)
  }
  if (params.tab || params.section) {
    const q = new URLSearchParams()
    if (params.section) q.set('section', params.section)
    redirect(q.toString() ? `/dashboard/profile?${q.toString()}` : '/dashboard/profile')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, resumesRes, tailoredRes] = await Promise.all([
    supabase.from('profiles').select('profile_data').eq('id', user.id).maybeSingle(),
    supabase
      .from('resumes')
      .select('id, title, ats_format_score, is_primary, created_at, original_file_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tailored_resumes')
      .select('id, job_id, version, tailored_score, match_score, created_at, jobs(title, company, apply_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const profileData: ProfileData = normalizeProfileData(
    (profileRes.data?.profile_data as ProfileData | null) ?? emptyProfileData()
  )
  const resumes = (resumesRes.data ?? []) as ResumeRow[]

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

  // One row per job (newest tailored version wins)
  const seenJobs = new Set<string>()
  const tailored = tailoredRaw.filter(row => {
    if (seenJobs.has(row.job_id)) return false
    seenJobs.add(row.job_id)
    return true
  })

  const hasMasterProfile = Boolean(
    profileData.summary?.trim() ||
      profileData.personal.firstName?.trim() ||
      profileData.personal.lastName?.trim() ||
      (profileData.experience?.length ?? 0) > 0 ||
      (profileData.projects?.length ?? 0) > 0 ||
      (profileData.education?.length ?? 0) > 0
  )

  const masterName =
    [profileData.personal.firstName, profileData.personal.lastName].filter(Boolean).join(' ') ||
    'Master resume'
  const masterTitle = profileData.personal.headline || 'Complete profile source'

  return (
    <ResumeLibrary
      resumes={resumes}
      tailored={tailored}
      hasMasterProfile={hasMasterProfile}
      masterName={masterName}
      masterTitle={masterTitle}
    />
  )
}
