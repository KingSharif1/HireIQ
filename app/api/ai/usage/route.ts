import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadUsageSummary } from '@/lib/ai/usage'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const summary = await loadUsageSummary(user.id)
  return NextResponse.json(summary)
}
