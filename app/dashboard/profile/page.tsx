import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileWorkspace } from '@/components/profile/ProfileWorkspace'
import { resolveProfileData } from '@/lib/profile/data'
import type { Profile, StructuredResume } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, latestResumeRes, resumesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
    supabase
      .from('resumes')
      .select('structured_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ structured_data: StructuredResume }>(),
    supabase
      .from('resumes')
      .select('id, title, ats_format_score, is_primary, created_at, original_file_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data
  const latestResume = latestResumeRes.data?.structured_data ?? null
  const initialData = resolveProfileData(profile, latestResume)

  return (
    <ProfileWorkspace
      userId={user.id}
      initialData={initialData}
      profile={profile}
      resumes={resumesRes.data ?? []}
    />
  )
}
