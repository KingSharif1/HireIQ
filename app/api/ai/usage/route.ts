import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AI_MODELS, isAllowedAiModel } from '@/lib/ai/models'
import { loadUsageSummary } from '@/lib/ai/usage'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('ai_model_strong, ai_model_fast')
    .eq('id', user.id)
    .maybeSingle()

  const models = {
    strong:
      profile?.ai_model_strong && isAllowedAiModel(profile.ai_model_strong)
        ? profile.ai_model_strong
        : AI_MODELS.strong,
    fast:
      profile?.ai_model_fast && isAllowedAiModel(profile.ai_model_fast)
        ? profile.ai_model_fast
        : AI_MODELS.fast,
  }

  const summary = await loadUsageSummary(user.id, models)
  return NextResponse.json(summary)
}
