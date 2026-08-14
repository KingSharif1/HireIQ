import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { failStaleBusyRun, getTailorRun, loadTailoredSnapshot } from '@/lib/tailor/runs'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const found = await getTailorRun(supabase, user.id, id)
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const run = await failStaleBusyRun(supabase, found)
  const tailored = await loadTailoredSnapshot(supabase, run.tailored_resume_id)
  return NextResponse.json({ run, tailored })
}
