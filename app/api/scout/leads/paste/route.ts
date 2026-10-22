import { NextResponse } from 'next/server'
import { resolveScoutUserId } from '@/lib/scout/auth'
import { parsePastedUrls } from '@/lib/scout/paste'
import { addLeadsFromUrls } from '@/lib/scout/leads'

export const runtime = 'nodejs'
export const maxDuration = 60

/** POST { text } — job links pasted by the user (or from the morning scout's list). Up to 10 per call. */
export async function POST(request: Request) {
  const userId = await resolveScoutUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { text?: unknown }
  const text = typeof body.text === 'string' ? body.text.slice(0, 20_000) : ''
  const urls = parsePastedUrls(text, 10)
  if (urls.length === 0) {
    return NextResponse.json({ error: 'No job links found in that text' }, { status: 400 })
  }

  const result = await addLeadsFromUrls(userId, urls)
  return NextResponse.json({ found: urls.length, ...result })
}
