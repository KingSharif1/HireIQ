import { NextResponse } from 'next/server'
import { resolveScoutUserId } from '@/lib/scout/auth'
import { decideLead } from '@/lib/scout/leads'

export const runtime = 'nodejs'
export const maxDuration = 60

/** PATCH { decision: 'like' | 'skip' | 'later' } */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await resolveScoutUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const body = (await request.json().catch(() => ({}))) as { decision?: string }
  if (body.decision !== 'like' && body.decision !== 'skip' && body.decision !== 'later') {
    return NextResponse.json({ error: 'decision must be like, skip or later' }, { status: 400 })
  }

  const result = await decideLead(userId, id, body.decision)
  if (!result.ok) {
    const status = result.code === 'not_found' ? 404 : 409
    return NextResponse.json({ error: result.message, code: result.code }, { status })
  }
  return NextResponse.json(result)
}
