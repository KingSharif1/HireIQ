import { redirect } from 'next/navigation'
import { readStoredSecret } from '@/lib/crypto/secret'
import { createClient } from '@/lib/supabase/server'
import { ApplicationsTracker } from '@/components/jobs/ApplicationsTracker'
import { FollowUpsPanel } from '@/components/tracker/FollowUpsPanel'
import { computeFollowUps, followUpDraft } from '@/lib/applications/follow-ups'
import type { Application, ApplicationTrackerItem, Job } from '@/types'

type AppRow = Application & {
  job: Pick<Job, 'id' | 'company' | 'title' | 'location' | 'created_at' | 'updated_at' | 'tailoring_status' | 'apply_url' | 'description' | 'remote_type' | 'extracted_data'> | null
}

type TailoredRow = {
  id: string
  job_id: string
  tailored_score: number | null
  match_score: number | null
  created_at: string
}

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string; view?: string }>
}) {
  const { jobId, view } = await searchParams
  // Legacy drawer deep-link → full-page job detail
  if (jobId) {
    redirect(`/dashboard/tracker/${jobId}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [appsRes, tailoredRes, inboundRes, runsRes, matchedInboundRes] = await Promise.all([
    supabase
      .from('applications')
      .select(`
        *,
        job:jobs!job_id (
          id, company, title, location, created_at, updated_at, tailoring_status, apply_url, description, remote_type, extracted_data
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('tailored_resumes')
      .select('id, job_id, tailored_score, match_score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('inbound_email_events')
      .select('id, from_address, subject, body_preview, created_at')
      .eq('user_id', user.id)
      .is('application_id', null)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('tailor_runs')
      .select('job_id, status')
      .eq('user_id', user.id)
      .in('status', ['analyzing_gaps', 'awaiting_answers', 'generating', 'needs_review'])
      .order('updated_at', { ascending: false }),
    supabase
      .from('inbound_email_events')
      .select('application_id')
      .eq('user_id', user.id)
      .not('application_id', 'is', null),
  ])

  const apps = (appsRes.data ?? []) as AppRow[]
  const latestByJob = new Map<string, TailoredRow>()
  for (const row of (tailoredRes.data ?? []) as TailoredRow[]) {
    if (!latestByJob.has(row.job_id)) latestByJob.set(row.job_id, row)
  }
  const runByJob = new Map<string, ApplicationTrackerItem['tailorRunStatus']>()
  for (const row of (runsRes.data ?? []) as Array<{
    job_id: string
    status: NonNullable<ApplicationTrackerItem['tailorRunStatus']>
  }>) {
    if (!runByJob.has(row.job_id)) runByJob.set(row.job_id, row.status)
  }

  const items: ApplicationTrackerItem[] = apps
    .filter((a): a is AppRow & { job: NonNullable<AppRow['job']> } => Boolean(a.job))
    .map(a => {
      const latest = latestByJob.get(a.job_id)
      return {
        ...a,
        ats_account_password: a.ats_account_password
          ? readStoredSecret(a.ats_account_password)
          : a.ats_account_password,
        job: a.job,
        score: latest?.tailored_score ?? latest?.match_score ?? null,
        tailored: Boolean(latest),
        tailoredResumeId: latest?.id ?? null,
        tailorRunStatus: runByJob.get(a.job_id) ?? null,
      }
    })

  const repliedIds = new Set(
    ((matchedInboundRes.data ?? []) as Array<{ application_id: string | null }>)
      .map((row) => row.application_id)
      .filter((id): id is string => Boolean(id)),
  )

  const followUpPlan = computeFollowUps(
    items.map((item) => ({
      applicationId: item.id,
      company: item.job.company ?? '',
      title: item.job.title ?? '',
      status: item.status,
      appliedAt: item.applied_at,
      followUpAt: item.follow_up_at,
      hasReply: repliedIds.has(item.id),
    })),
  )
  const dueFollowUps = followUpPlan.due.map((entry) => ({
    applicationId: entry.candidate.applicationId,
    company: entry.candidate.company,
    title: entry.candidate.title,
    dueAt: entry.dueAt,
    daysUntilDue: entry.daysUntilDue,
    draft: followUpDraft(entry),
  }))

  return (
    <>
      <FollowUpsPanel initialDue={dueFollowUps} />
      <ApplicationsTracker
        initialItems={items}
        initialSurface={view === 'outreach' ? 'outreach' : 'applications'}
        unmatchedInbound={inboundRes.data ?? []}
      />
    </>
  )
}
