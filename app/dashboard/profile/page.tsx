import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileHome } from '@/components/profile/ProfileHome'
import { loadProfileWorkspaceData } from '@/lib/profile/load-workspace'

export const dynamic = 'force-dynamic'

/**
 * Profile = master resume (documents + career content + pending accept/deny).
 * `?section=` deep-links into a document tab or master section.
 */
export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { profile, initialData, resumes, githubData } = await loadProfileWorkspaceData(user.id)

  return (
    <Suspense fallback={null}>
      <ProfileHome
        userId={user.id}
        initialData={initialData}
        profile={profile}
        resumes={resumes}
        githubData={githubData}
      />
    </Suspense>
  )
}
