import type { SupabaseClient } from '@supabase/supabase-js'
import { parseAuthNames } from '@/lib/auth/messages'

/** Keep profiles row in sync after OAuth / first login. Idempotent. */
export async function syncProfileFromAuthUser(
  supabase: SupabaseClient,
  userId: string,
  email: string | undefined,
  metadata: Record<string, unknown> | undefined
) {
  const { firstName, lastName, fullName } = parseAuthNames(metadata)

  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }
  if (email) updates.email = email
  if (firstName) updates.first_name = firstName
  if (lastName) updates.last_name = lastName
  if (fullName) updates.full_name = fullName

  if (Object.keys(updates).length <= 1) return

  await supabase.from('profiles').update(updates).eq('id', userId)
}
