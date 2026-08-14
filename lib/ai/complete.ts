import { generateText, streamText } from 'ai'
import {
  extractTokenUsage,
  recordAiUsage,
  type AiKeySource,
} from '@/lib/ai/usage'
import type { AiFeature } from '@/lib/ai/models'
import { modelForTier, type AiRuntime } from '@/lib/ai/runtime'

type GenerateArgs = {
  runtime: AiRuntime
  feature: AiFeature
  tier: 'strong' | 'fast'
  prompt: string
  maxOutputTokens: number
  modelOverride?: string
}

export async function generateAiText(args: GenerateArgs): Promise<{ text: string; model: string }> {
  const model = args.modelOverride ?? modelForTier(args.runtime, args.tier)
  const result = await generateText({
    model: args.runtime.anthropic(model),
    prompt: args.prompt,
    maxOutputTokens: args.maxOutputTokens,
  })
  const { inputTokens, outputTokens } = extractTokenUsage(result.usage)
  await recordAiUsage({
    userId: args.runtime.userId,
    feature: args.feature,
    model,
    keySource: args.runtime.keySource,
    inputTokens,
    outputTokens,
  })
  return { text: result.text, model }
}

export function streamAiText(
  args: GenerateArgs & {
    onText?: (text: string) => Promise<void>
  },
) {
  const model = args.modelOverride ?? modelForTier(args.runtime, args.tier)
  return streamText({
    model: args.runtime.anthropic(model),
    prompt: args.prompt,
    maxOutputTokens: args.maxOutputTokens,
    onFinish: async ({ text, usage }) => {
      const { inputTokens, outputTokens } = extractTokenUsage(usage)
      await recordAiUsage({
        userId: args.runtime.userId,
        feature: args.feature,
        model,
        keySource: args.runtime.keySource as AiKeySource,
        inputTokens,
        outputTokens,
      })
      if (args.onText) await args.onText(text)
    },
  })
}
