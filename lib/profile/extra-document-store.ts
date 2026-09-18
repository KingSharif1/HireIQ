import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveProfileData } from '@/lib/profile/data'
import type { Profile, ProfileDocument } from '@/types'

export async function patchAdditionalDocuments(
  supabase: SupabaseClient,
  userId: string,
  mutate: (docs: ProfileDocument[]) => ProfileDocument[]
) {
  const { data: profile, error: loadError } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, profile_data')
    .eq('id', userId)
    .single<Pick<Profile, 'first_name' | 'last_name' | 'email' | 'profile_data'>>()

  if (loadError || !profile) {
    return { error: loadError?.message || 'Profile not found', documents: [] as ProfileDocument[] }
  }

  const resolved = resolveProfileData(profile)
  const additionalDocuments = mutate(resolved.additionalDocuments)
  const { error } = await supabase
    .from('profiles')
    .update({
      profile_data: { ...resolved, additionalDocuments, attachments: [] },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return { error: error?.message ?? null, documents: additionalDocuments }
}
