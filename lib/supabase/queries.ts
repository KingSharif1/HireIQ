import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Profile,
  Resume,
  Job,
  Application,
  ApplicationEvent,
  TailoredResume,
  StructuredResume,
  JobExtractedData,
  ResumeDiffChange,
  Notification,
} from '@/types'
import type { NotificationInsert } from '@/lib/notifications'

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export async function getProfile(db: SupabaseClient, userId: string) {
  return db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single<Profile>()
}

export async function updateProfile(
  db: SupabaseClient,
  userId: string,
  updates: Partial<Pick<Profile, 'first_name' | 'last_name' | 'username' | 'target_role' | 'years_experience'>>
) {
  return db
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single<Profile>()
}

// ---------------------------------------------------------------------------
// Resumes
// ---------------------------------------------------------------------------

export async function getResumes(db: SupabaseClient, userId: string) {
  return db
    .from('resumes')
    .select('id, title, ats_format_score, is_primary, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<Pick<Resume, 'id' | 'title' | 'ats_format_score' | 'is_primary' | 'created_at' | 'updated_at'>[]>()
}

export async function getResume(db: SupabaseClient, resumeId: string) {
  return db
    .from('resumes')
    .select('*')
    .eq('id', resumeId)
    .single<Resume>()
}

export async function createResume(
  db: SupabaseClient,
  userId: string,
  data: {
    title: string
    raw_text: string
    structured_data: StructuredResume
    original_file_url?: string
    original_file_type?: string
    ats_format_score?: number
  }
) {
  return db
    .from('resumes')
    .insert({ user_id: userId, ...data })
    .select()
    .single<Resume>()
}

export async function updateResume(
  db: SupabaseClient,
  resumeId: string,
  updates: Partial<Pick<Resume, 'title' | 'structured_data' | 'ats_format_score' | 'is_primary'>>
) {
  return db
    .from('resumes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', resumeId)
    .select()
    .single<Resume>()
}

export async function setPrimaryResume(db: SupabaseClient, userId: string, resumeId: string) {
  // Clear existing primary, then set the new one
  await db.from('resumes').update({ is_primary: false }).eq('user_id', userId)
  return db
    .from('resumes')
    .update({ is_primary: true, updated_at: new Date().toISOString() })
    .eq('id', resumeId)
    .select()
    .single<Resume>()
}

export async function deleteResume(db: SupabaseClient, resumeId: string) {
  return db.from('resumes').delete().eq('id', resumeId)
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function getJobs(db: SupabaseClient, userId: string) {
  return db
    .from('jobs')
    .select('id, company, title, location, remote_type, source, application_status, tailoring_status, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .returns<Pick<Job, 'id' | 'company' | 'title' | 'location' | 'remote_type' | 'source' | 'application_status' | 'tailoring_status' | 'created_at' | 'updated_at'>[]>()
}

export async function updateJobStatus(
  db: SupabaseClient,
  jobId: string,
  updates: Partial<Pick<Job, 'application_status' | 'tailoring_status'>>
) {
  return db
    .from('jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .select()
    .single<Job>()
}

// ---------------------------------------------------------------------------
// Applications (Task 107)
// ---------------------------------------------------------------------------

export async function getApplicationsForUser(db: SupabaseClient, userId: string) {
  return db
    .from('applications')
    .select(`
      *,
      job:jobs!job_id (
        id, company, title, location, created_at, updated_at, tailoring_status
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .returns<(Application & {
      job: Pick<Job, 'id' | 'company' | 'title' | 'location' | 'created_at' | 'updated_at' | 'tailoring_status'>
    })[]>()
}

export async function getApplicationByJob(
  db: SupabaseClient,
  userId: string,
  jobId: string
) {
  return db
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .maybeSingle<Application>()
}

export async function getApplicationEvents(
  db: SupabaseClient,
  applicationId: string
) {
  return db
    .from('application_events')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .returns<ApplicationEvent[]>()
}

export async function updateApplicationNotes(
  db: SupabaseClient,
  applicationId: string,
  notes: string | null
) {
  return db
    .from('applications')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', applicationId)
    .select()
    .single<Application>()
}

export async function getJob(db: SupabaseClient, jobId: string) {
  return db
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single<Job>()
}

export async function createJob(
  db: SupabaseClient,
  userId: string,
  data: {
    title: string
    company: string
    description: string
    source?: string
    location?: string
    remote_type?: string
    apply_url?: string
    extracted_data?: JobExtractedData
  }
) {
  return db
    .from('jobs')
    .insert({ user_id: userId, source: 'manual', ...data })
    .select()
    .single<Job>()
}

export async function updateJobExtractedData(
  db: SupabaseClient,
  jobId: string,
  extractedData: JobExtractedData
) {
  return db
    .from('jobs')
    .update({ extracted_data: extractedData })
    .eq('id', jobId)
    .select()
    .single<Job>()
}

export async function deleteJob(db: SupabaseClient, jobId: string) {
  return db.from('jobs').delete().eq('id', jobId)
}

// ---------------------------------------------------------------------------
// Resume Enhancements (Q&A answers from gap-fill flow)
// ---------------------------------------------------------------------------

export async function createEnhancement(
  db: SupabaseClient,
  userId: string,
  data: { category: string; question: string; answer: string }
) {
  return db
    .from('resume_enhancements')
    .insert({ user_id: userId, ...data })
    .select()
    .single()
}

export async function getEnhancements(db: SupabaseClient, userId: string) {
  return db
    .from('resume_enhancements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

// ---------------------------------------------------------------------------
// Tailored Resumes
// ---------------------------------------------------------------------------

export async function getTailoredResume(db: SupabaseClient, tailoredId: string) {
  return db
    .from('tailored_resumes')
    .select(`
      *,
      base_resume:resumes!base_resume_id(id, title),
      job:jobs!job_id(id, title, company, description, extracted_data)
    `)
    .eq('id', tailoredId)
    .single<TailoredResume & {
      base_resume: Pick<Resume, 'id' | 'title'>
      job: Pick<Job, 'id' | 'title' | 'company' | 'description' | 'extracted_data'>
    }>()
}

export async function getTailoredResumesForJob(db: SupabaseClient, jobId: string) {
  return db
    .from('tailored_resumes')
    .select('id, version, match_score, tailored_score, cover_letter, user_edited, created_at')
    .eq('job_id', jobId)
    .order('version', { ascending: false })
}

export async function getTailoredResumesForUser(db: SupabaseClient, userId: string) {
  return db
    .from('tailored_resumes')
    .select(`
      id, match_score, tailored_score, created_at,
      job:jobs!job_id(id, title, company)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function createTailoredResume(
  db: SupabaseClient,
  userId: string,
  data: {
    base_resume_id: string
    job_id: string
    structured_data: StructuredResume
    changes: ResumeDiffChange[]
    match_score: number
    tailored_score: number
  }
) {
  return db
    .from('tailored_resumes')
    .insert({ user_id: userId, ...data })
    .select()
    .single<TailoredResume>()
}

export async function updateTailoredResumeCoverLetter(
  db: SupabaseClient,
  tailoredId: string,
  coverLetter: string
) {
  return db
    .from('tailored_resumes')
    .update({ cover_letter: coverLetter })
    .eq('id', tailoredId)
    .select()
    .single<TailoredResume>()
}

export async function updateTailoredResumeExportUrls(
  db: SupabaseClient,
  tailoredId: string,
  urls: { pdf_url?: string; docx_url?: string }
) {
  return db
    .from('tailored_resumes')
    .update(urls)
    .eq('id', tailoredId)
    .select()
    .single<TailoredResume>()
}

// ---------------------------------------------------------------------------
// Notifications (Phase 4)
// ---------------------------------------------------------------------------

export async function getNotifications(db: SupabaseClient, userId: string, limit = 50) {
  return db
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<Notification[]>()
}

export async function getUnreadNotificationCount(db: SupabaseClient, userId: string) {
  return db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
}

export async function insertNotifications(db: SupabaseClient, rows: NotificationInsert[]) {
  if (rows.length === 0) return { data: [], error: null }
  return db.from('notifications').insert(rows).select()
}

export async function markNotificationsRead(
  db: SupabaseClient,
  userId: string,
  opts: { ids?: string[]; refId?: string; markAll?: boolean }
) {
  let query = db
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (opts.markAll) {
    return query.select('id')
  }
  if (opts.refId) {
    return query.eq('ref_id', opts.refId).select('id')
  }
  if (opts.ids?.length) {
    return query.in('id', opts.ids).select('id')
  }
  return { data: [], error: null }
}
