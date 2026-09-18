import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

/** Download a private resumes-bucket object. Try the user session first, then service role. */
export async function downloadResumeObject(
  path: string,
  userClient: SupabaseClient
): Promise<Blob | null> {
  const userAttempt = await userClient.storage.from('resumes').download(path)
  if (userAttempt.data && !userAttempt.error) return userAttempt.data

  try {
    const admin = createAdminClient()
    const adminAttempt = await admin.storage.from('resumes').download(path)
    if (adminAttempt.data && !adminAttempt.error) return adminAttempt.data
  } catch (err) {
    console.error('[resume-storage] admin download unavailable', err)
  }

  console.error('[resume-storage] download failed', { path, error: userAttempt.error?.message })
  return null
}

export async function removeResumeObject(
  path: string,
  userClient: SupabaseClient
): Promise<boolean> {
  const userAttempt = await userClient.storage.from('resumes').remove([path])
  if (!userAttempt.error) return true

  try {
    const admin = createAdminClient()
    const adminAttempt = await admin.storage.from('resumes').remove([path])
    return !adminAttempt.error
  } catch (err) {
    console.error('[resume-storage] admin remove unavailable', err)
    return false
  }
}
