import { createAnthropic } from '@ai-sdk/anthropic'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/crypto/secret'
import { AI_MODELS, isAllowedAiModel } from '@/lib/ai/models'
import type { AiKeySource } from '@/lib/ai/usage'

export class AiConfigError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message)
    this.name = 'AiConfigError'
  }
}

export type AiRuntime = {
  userId: string
  keySource: AiKeySource
  models: { strong: string; fast: string }
  anthropic: ReturnType<typeof createAnthropic>
}

export async function resolveAiRuntime(userId: string): Promise<AiRuntime> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('ai_key_source, ai_model_strong, ai_model_fast')
    .eq('id', userId)
    .maybeSingle()

  const keySource: AiKeySource = profile?.ai_key_source === 'byok' ? 'byok' : 'hireiq'
  const strong =
    profile?.ai_model_strong && isAllowedAiModel(profile.ai_model_strong)
      ? profile.ai_model_strong
      : AI_MODELS.strong
  const fast =
    profile?.ai_model_fast && isAllowedAiModel(profile.ai_model_fast)
      ? profile.ai_model_fast
      : AI_MODELS.fast

  let apiKey: string | undefined
  if (keySource === 'byok') {
    const { data: secret } = await admin
      .from('user_ai_secrets')
      .select('anthropic_key_ciphertext')
      .eq('user_id', userId)
      .maybeSingle()
    if (!secret?.anthropic_key_ciphertext) {
      throw new AiConfigError(
        'Add your Anthropic API key in Settings → AI, or switch back to HireIQ’s key.',
        400,
      )
    }
    apiKey = decryptSecret(secret.anthropic_key_ciphertext)
  } else {
    apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new AiConfigError(
        'HireIQ’s Claude key is not configured. Add your own key in Settings → AI.',
        503,
      )
    }
  }

  return {
    userId,
    keySource,
    models: { strong, fast },
    anthropic: createAnthropic({ apiKey }),
  }
}

export function modelForTier(runtime: AiRuntime, tier: 'strong' | 'fast'): string {
  return tier === 'fast' ? runtime.models.fast : runtime.models.strong
}
