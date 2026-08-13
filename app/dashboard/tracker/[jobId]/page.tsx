import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  JobDetailPage,
  type JobDetailTailoredVersion,
} from '@/components/jobs/JobDetailPage'
import { emptyProfileData } from '@/lib/profile/data'
import { normalizeProfileData } from '@/lib/profile/provenance'
import type {
  Application,
  ApplicationEvent,
  ApplicationTrackerItem,
  Job,
  ProfileData,
  StructuredResume,
  TailorGapAnswer,
} from '@/types'

type AppRow = Application & {
  job: Pick<
    Job,
    | 'id'
    | 'company'
    | 'title'
    | 'location'
    | 'created_at'
    | 'updated_at'
    | 'tailoring_status'
    | 'apply_url'
    | 'description'
    | 'remote_type'
    | 'extracted_data'
  > | null
}

export default async function TrackerJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // `*` includes form_answers (migration 014) for ApplicationAnswers on the Activity tab.
  const [{ data: appRow }, { data: profile }] = await Promise.all([
    supabase
      .from('applications')
      .select(
        `
      *,
      job:jobs!job_id (
        id, company, title, location, created_at, updated_at, tailoring_status,
        apply_url, description, remote_type, extracted_data
      )
    `
      )
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .maybeSingle(),
    supabase.from('profiles').select('profile_data, email_tracking_mode, masked_email').eq('id', user.id).maybeSingle(),
  ])

  const app = appRow as AppRow | null
  if (!app?.job) notFound()

  const emailTrackingEnabled = (profile as { email_tracking_mode?: string } | null)?.email_tracking_mode !== 'off'
  const applyEmail =
    (profile as { email_tracking_mode?: string; masked_email?: string | null } | null)?.email_tracking_mode ===
      'masked'
      ? (profile as { masked_email?: string | null }).masked_email ?? null
      : null

  const [eventsRes, tailoredRes] = await Promise.all([
    supabase
      .from('application_events')
      .select('*')
      .eq('application_id', app.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tailored_resumes')
      .select(
        'id, version, tailored_score, match_score, cover_letter, gap_answers, structured_data, created_at'
      )
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .order('version', { ascending: false }),
  ])

  const rawVersions = (tailoredRes.data ?? []) as Array<{
    id: string
    version: number
    tailored_score: number | null
    match_score: number | null
    cover_letter: string | null
    gap_answers: TailorGapAnswer[] | null
    structured_data: StructuredResume | null
    created_at: string
  }>

  const latest = rawVersions[0]
  const score = latest?.tailored_score ?? latest?.match_score ?? null

  const item: ApplicationTrackerItem = {
    ...app,
    job: app.job,
    score,
    tailored: rawVersions.length > 0,
    tailoredResumeId: latest?.id ?? null,
  }

  const events = (eventsRes.data ?? []) as ApplicationEvent[]

  const versions: JobDetailTailoredVersion[] = rawVersions.map(v => ({
    id: v.id,
    version: v.version,
    tailored_score: v.tailored_score,
    match_score: v.match_score,
    cover_letter: v.cover_letter,
    gap_answers: Array.isArray(v.gap_answers) ? v.gap_answers : [],
    structured_data: v.structured_data,
    created_at: v.created_at,
  }))

  const profileData: ProfileData = normalizeProfileData(
    (profile?.profile_data as ProfileData | null) ?? emptyProfileData()
  )

  return (
    <Suspense fallback={null}>
      <JobDetailPage
        item={item}
        events={events}
        tailoredVersions={versions}
        profileData={profileData}
        emailTrackingEnabled={emailTrackingEnabled}
        applyEmail={applyEmail}
      />
    </Suspense>
  )
}
