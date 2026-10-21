import { NextResponse } from 'next/server'
import { resolveScoutUserId } from '@/lib/scout/auth'
import { checkLead } from '@/lib/scout/leads'

export const runtime = 'nodejs'
export const maxDuration = 60

/** POST: open the employer page; report live/closed, safety and apply-form map. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await resolveScoutUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const summary = await checkLead(userId, id)
  if (!summary) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  return NextResponse.json(summary)
}
