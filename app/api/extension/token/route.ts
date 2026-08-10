import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createApiToken,
  getActiveTokenMeta,
  revokeActiveTokens,
} from '@/lib/extension/tokens'

export const runtime = 'nodejs'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/** Status of the active Chrome extension token (never returns plaintext). */
export async function GET() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const meta = await getActiveTokenMeta(user.id)
    return NextResponse.json({
      connected: Boolean(meta),
      token: meta
        ? {
            id: meta.id,
            label: meta.label,
            last_used_at: meta.last_used_at,
            created_at: meta.created_at,
          }
        : null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed'
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/** Create (or rotate) extension token — plaintext returned once. */
export async function POST() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const created = await createApiToken(user.id)
    return NextResponse.json({
      token: created.token,
      id: created.id,
      label: created.label,
      created_at: created.created_at,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create token'
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/** Revoke all active extension tokens for this user. */
export async function DELETE() {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await revokeActiveTokens(user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to revoke'
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
