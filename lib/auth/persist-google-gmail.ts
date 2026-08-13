import type { SupabaseClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import { saveGoogleConnection } from '@/lib/google/connection'

/** After Google OAuth login, persist Gmail refresh token when Supabase returns it. */
export async function maybePersistGoogleGmailTokens(
  supabase: SupabaseClient,
  session: Session | null,
): Promise<boolean> {
  if (!session?.user) return false

  const refresh = session.provider_refresh_token
  const access = session.provider_token
  if (!refresh) return false

  const provider =
    session.user.app_metadata?.provider ??
    session.user.identities?.find(i => i.provider === 'google')?.provider
  if (provider && provider !== 'google') return false

  const email =
    session.user.email ??
    (typeof session.user.user_metadata?.email === 'string'
      ? session.user.user_metadata.email
      : null)
  if (!email) return false

  await saveGoogleConnection(supabase, session.user.id, {
    email,
    accessToken: access ?? '',
    refreshToken: refresh,
    scopes: 'gmail.readonly',
    expiresIn: 3600,
  })

  await supabase
    .from('profiles')
    .update({
      email_tracking_mode: 'gmail',
      gmail_sync_enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id)

  return true
}
