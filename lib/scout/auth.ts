import { createClient } from '@/lib/supabase/server'
import { resolveExtensionUserId } from '@/lib/extension/tokens'

/** Signed-in browser session, or `Authorization: Bearer hiq_…` (used by the scout agent). */
export async function resolveScoutUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get('authorization') || ''
  if (auth.startsWith('Bearer ')) {
    return resolveExtensionUserId(auth.slice(7))
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}
