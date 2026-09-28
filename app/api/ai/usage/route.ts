import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveModels } from '@/lib/ai/models'
import { loadUsageSummary } from '@/lib/ai/usage'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('ai_key_source, ai_model_strong, ai_model_fast')
    .eq('id', user.id)
    .maybeSingle()

  const keySource = profile?.ai_key_source === 'byok' ? 'byok' : 'hireiq'
  const models = effectiveModels(keySource, {
    strong: profile?.ai_model_strong,
    fast: profile?.ai_model_fast,
  })

  const summary = await loadUsageSummary(user.id, models)
  return NextResponse.json(summary)
}
