import { createHash, randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const CODE_TTL_MS = 5 * 60 * 1000

export function generateConnectCode(): string {
  return `hiqc_${randomBytes(24).toString('base64url')}`
}

export function hashConnectCode(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex')
}

export async function mintConnectCode(input: {
  userId: string
  accessToken: string
  refreshToken: string
}) {
  const admin = createAdminClient()
  const code = generateConnectCode()
  const code_hash = hashConnectCode(code)
  const expires_at = new Date(Date.now() + CODE_TTL_MS).toISOString()

  // Invalidate unused codes for this user
  await admin
    .from('extension_connect_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', input.userId)
    .is('used_at', null)

  const { error } = await admin.from('extension_connect_codes').insert({
    user_id: input.userId,
    code_hash,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    expires_at,
  })

  if (error) throw new Error(error.message)
  return { code, expiresAt: expires_at }
}

export async function exchangeConnectCode(code: string): Promise<{
  accessToken: string
  refreshToken: string
  userId: string
  email: string | null
} | null> {
  const trimmed = code.trim()
  if (!trimmed.startsWith('hiqc_')) return null

  const admin = createAdminClient()
  const code_hash = hashConnectCode(trimmed)
  const { data, error } = await admin
    .from('extension_connect_codes')
    .select('id, user_id, access_token, refresh_token, expires_at, used_at')
    .eq('code_hash', code_hash)
    .maybeSingle()

  if (error || !data) return null
  if (data.used_at) return null
  if (new Date(data.expires_at as string).getTime() < Date.now()) return null

  await admin
    .from('extension_connect_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id)

  const { data: userData } = await admin.auth.admin.getUserById(data.user_id as string)

  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    userId: data.user_id as string,
    email: userData.user?.email ?? null,
  }
}
