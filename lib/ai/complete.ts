import { generateText, streamText, type ModelMessage } from 'ai'
import {
  extractTokenUsage,
  recordAiUsage,
  type AiKeySource,
} from '@/lib/ai/usage'
import { AI_SDK_MAX_RETRIES, type AiFeature } from '@/lib/ai/models'
import { modelForTier, type AiRuntime } from '@/lib/ai/runtime'

type GenerateArgs = {
  runtime: AiRuntime
  feature: AiFeature
  tier: 'strong' | 'fast'
  prompt: string
  maxOutputTokens: number
  modelOverride?: string
}

type StreamPartialArgs = {
  onPartial?: (text: string) => Promise<void> | void
  partialEveryMs?: number
}

async function consumeTextStream(
  result: ReturnType<typeof streamText>,
  args: {
    runtime: AiRuntime
    feature: AiFeature
    model: string
  } & StreamPartialArgs
): Promise<{ text: string; model: string }> {
  let full = ''
  let lastPartial = 0
  const every = args.partialEveryMs ?? 900
  for await (const delta of result.textStream) {
    full += delta
    if (!args.onPartial) continue
    const now = Date.now()
    if (now - lastPartial < every) continue
    lastPartial = now
    await args.onPartial(full)
  }

  const usage = await result.usage
  const { inputTokens, outputTokens } = extractTokenUsage(usage)
  await recordAiUsage({
    userId: args.runtime.userId,
    feature: args.feature,
    model: args.model,
    keySource: args.runtime.keySource,
    inputTokens,
    outputTokens,
  })
  if (args.onPartial) await args.onPartial(full)
  return { text: full, model: args.model }
}

export async function generateAiText(args: GenerateArgs): Promise<{ text: string; model: string }> {
  const model = args.modelOverride ?? modelForTier(args.runtime, args.tier)
  const result = await generateText({
    model: args.runtime.anthropic(model),
    prompt: args.prompt,
    maxOutputTokens: args.maxOutputTokens,
    maxRetries: AI_SDK_MAX_RETRIES,
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

/**
 * Stream a completion to the end (for durable workers). Optional throttled `onPartial`
 * for live progress; usage recorded once finished.
 */
export async function streamAiTextToCompletion(
  args: GenerateArgs & StreamPartialArgs,
): Promise<{ text: string; model: string }> {
  const model = args.modelOverride ?? modelForTier(args.runtime, args.tier)
  const result = streamText({
    model: args.runtime.anthropic(model),
    prompt: args.prompt,
    maxOutputTokens: args.maxOutputTokens,
    maxRetries: AI_SDK_MAX_RETRIES,
  })
  return consumeTextStream(result, {
    runtime: args.runtime,
    feature: args.feature,
    model,
    onPartial: args.onPartial,
    partialEveryMs: args.partialEveryMs,
  })
}

/** Multimodal / PDF vision path — pass file parts in messages. */
export async function streamAiMessagesToCompletion(
  args: Omit<GenerateArgs, 'prompt'> &
    StreamPartialArgs & {
      messages: ModelMessage[]
    },
): Promise<{ text: string; model: string }> {
  const model = args.modelOverride ?? modelForTier(args.runtime, args.tier)
  const result = streamText({
    model: args.runtime.anthropic(model),
    messages: args.messages,
    maxOutputTokens: args.maxOutputTokens,
    maxRetries: AI_SDK_MAX_RETRIES,
  })
  return consumeTextStream(result, {
    runtime: args.runtime,
    feature: args.feature,
    model,
    onPartial: args.onPartial,
    partialEveryMs: args.partialEveryMs,
  })
}

export function streamAiText(
  args: GenerateArgs & {
    onText?: (text: string) => Promise<void>
    onSettled?: () => void
  },
) {
  const model = args.modelOverride ?? modelForTier(args.runtime, args.tier)
  const settled = () => {
    try {
      args.onSettled?.()
    } catch {
      /* lock release must not throw */
    }
  }
  return streamText({
    model: args.runtime.anthropic(model),
    prompt: args.prompt,
    maxOutputTokens: args.maxOutputTokens,
    maxRetries: AI_SDK_MAX_RETRIES,
    onFinish: async ({ text, usage }) => {
      try {
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
      } finally {
        settled()
      }
    },
    onError: () => {
      settled()
    },
  })
}
