import { createHash, randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const TOKEN_PREFIX = 'hiq_'

export function generateExtensionToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
}

export function hashExtensionToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex')
}

export type ApiTokenRow = {
  id: string
  user_id: string
  token_hash: string
  label: string
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
}

export async function createApiToken(userId: string, label = 'Chrome extension') {
  const admin = createAdminClient()
  const plaintext = generateExtensionToken()
  const token_hash = hashExtensionToken(plaintext)

  // Revoke any active tokens for this user (one active extension token)
  await admin
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null)

  const { data, error } = await admin
    .from('api_tokens')
    .insert({ user_id: userId, token_hash, label })
    .select('id, created_at, label')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create token')
  }

  return { token: plaintext, id: data.id as string, created_at: data.created_at as string, label: data.label as string }
}

export async function getActiveTokenMeta(userId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('api_tokens')
    .select('id, label, last_used_at, created_at')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function revokeActiveTokens(userId: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null)

  if (error) throw new Error(error.message)
}

/** Resolve Bearer token → user_id; updates last_used_at. */
export async function resolveTokenUserId(bearerToken: string): Promise<string | null> {
  const token = bearerToken.trim()
  if (!token.startsWith(TOKEN_PREFIX)) return null

  const admin = createAdminClient()
  const token_hash = hashExtensionToken(token)
  const { data, error } = await admin
    .from('api_tokens')
    .select('id, user_id')
    .eq('token_hash', token_hash)
    .is('revoked_at', null)
    .maybeSingle()

  if (error || !data) return null

  await admin
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return data.user_id as string
}

/**
 * Resolve extension Bearer auth:
 * 1) legacy `hiq_…` API token, or
 * 2) Supabase access JWT from Google / email sign-in in the extension.
 */
export async function resolveExtensionUserId(bearerToken: string): Promise<string | null> {
  const token = bearerToken.trim()
  if (!token) return null

  if (token.startsWith(TOKEN_PREFIX)) {
    return resolveTokenUserId(token)
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}
