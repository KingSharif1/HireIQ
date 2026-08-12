import { createClient } from '@/lib/supabase/server'
import { resolveProfileData } from '@/lib/profile/data'
import type { ResumeRow } from '@/lib/profile/resume-row'
import type { Profile, StructuredResume } from '@/types'

/** Shared server load for Profile + Builder master editors. */
export async function loadProfileWorkspaceData(userId: string) {
  const supabase = await createClient()

  const [profileRes, latestResumeRes, resumesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single<Profile>(),
    supabase
      .from('resumes')
      .select('structured_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ structured_data: StructuredResume }>(),
    supabase
      .from('resumes')
      .select('id, title, ats_format_score, is_primary, created_at, original_file_url')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data
  const latestResume = latestResumeRes.data?.structured_data ?? null
  const initialData = resolveProfileData(profile, latestResume)
  const resumes = (resumesRes.data ?? []) as ResumeRow[]

  return {
    profile,
    initialData,
    resumes,
    githubData: profile?.github_data ?? null,
  }
}
