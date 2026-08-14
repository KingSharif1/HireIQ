import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  AI_FEATURES,
  AI_MODEL_CATALOG,
  AI_MODELS,
  isAllowedAiModel,
} from '@/lib/ai/models'
import { encryptSecret, last4 } from '@/lib/crypto/secret'

export const runtime = 'nodejs'

function looksLikeAnthropicKey(key: string): boolean {
  return /^sk-ant-/.test(key.trim())
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('ai_key_source, ai_model_strong, ai_model_fast, anthropic_key_last4')
    .eq('id', user.id)
    .maybeSingle()

  const keySource = profile?.ai_key_source === 'byok' ? 'byok' : 'hireiq'
  const modelStrong = profile?.ai_model_strong && isAllowedAiModel(profile.ai_model_strong)
    ? profile.ai_model_strong
    : AI_MODELS.strong
  const modelFast = profile?.ai_model_fast && isAllowedAiModel(profile.ai_model_fast)
    ? profile.ai_model_fast
    : AI_MODELS.fast

  return NextResponse.json({
    keySource,
    hasOwnKey: Boolean(profile?.anthropic_key_last4),
    keyLast4: profile?.anthropic_key_last4 ?? null,
    hireiqKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    modelStrong,
    modelFast,
    catalog: AI_MODEL_CATALOG,
    features: AI_FEATURES,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as {
    keySource?: 'hireiq' | 'byok'
    apiKey?: string
    clearKey?: boolean
    modelStrong?: string
    modelFast?: string
  }

  const admin = createAdminClient()
  const patch: Record<string, string | null> = {}

  if (body.keySource === 'hireiq' || body.keySource === 'byok') {
    patch.ai_key_source = body.keySource
  }

  if (body.modelStrong) {
    if (!isAllowedAiModel(body.modelStrong)) {
      return NextResponse.json({ error: 'Unknown strong model' }, { status: 400 })
    }
    patch.ai_model_strong = body.modelStrong
  }

  if (body.modelFast) {
    if (!isAllowedAiModel(body.modelFast)) {
      return NextResponse.json({ error: 'Unknown fast model' }, { status: 400 })
    }
    patch.ai_model_fast = body.modelFast
  }

  if (body.clearKey) {
    await admin.from('user_ai_secrets').delete().eq('user_id', user.id)
    patch.anthropic_key_last4 = null
    if (body.keySource !== 'hireiq') patch.ai_key_source = 'hireiq'
  } else if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
    const key = body.apiKey.trim()
    if (!looksLikeAnthropicKey(key)) {
      return NextResponse.json(
        { error: 'That does not look like an Anthropic key (expected sk-ant-…).' },
        { status: 400 },
      )
    }
    const ciphertext = encryptSecret(key)
    await admin.from('user_ai_secrets').upsert({
      user_id: user.id,
      anthropic_key_ciphertext: ciphertext,
      updated_at: new Date().toISOString(),
    })
    patch.anthropic_key_last4 = last4(key)
  }

  if (patch.ai_key_source === 'byok') {
    const { data: secret } = await admin
      .from('user_ai_secrets')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!secret) {
      return NextResponse.json(
        { error: 'Paste your Anthropic API key before switching to “use my key”.' },
        { status: 400 },
      )
    }
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from('profiles').update(patch).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return GET()
}
