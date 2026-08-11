import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveExtensionUserId } from '@/lib/extension/tokens'
import { ApplicationStatusError, setApplicationStatus } from '@/lib/applications/status'

export const runtime = 'nodejs'

const STATUSES = [
  'bookmarked',
  'applying',
  'applied',
  'interviewing',
  'negotiating',
  'offer',
  'accepted',
  'rejected',
] as const

const bodySchema = z.object({
  status: z.enum(STATUSES),
  meta: z.record(z.string(), z.unknown()).optional(),
})

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    origin && (origin.startsWith('chrome-extension://') || origin === 'http://localhost:3000')
      ? origin
      : '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

/**
 * Bearer-authed status update for the Chrome extension (after user-watched submit).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)
  const { id: jobId } = await context.params

  const auth = request.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!bearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  }

  let userId: string | null
  try {
    userId = await resolveExtensionUserId(bearer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth failed'
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500
    return NextResponse.json({ error: message }, { status, headers })
  }
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401, headers })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400, headers },
    )
  }

  const admin = createAdminClient()
  try {
    const application = await setApplicationStatus(admin, {
      userId,
      jobId,
      status: parsed.data.status,
      meta: { via: 'extension', ...(parsed.data.meta ?? {}) },
    })
    return NextResponse.json({ application }, { status: 200, headers })
  } catch (err) {
    if (err instanceof ApplicationStatusError) {
      const status = err.code === 'not_found' ? 404 : 500
      return NextResponse.json({ error: err.message }, { status, headers })
    }
    throw err
  }
}
