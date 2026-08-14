import { NextResponse } from 'next/server'
import { AiConfigError } from '@/lib/ai/runtime'

/** Log and return a JSON error — surfaces real message in development. */
export function aiErrorResponse(err: unknown, fallback: string) {
  console.error('[AI]', err)
  if (err instanceof AiConfigError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  let message = err instanceof Error ? err.message : fallback
  let status = 500
  // Anthropic returns terse model errors — make them readable in the UI.
  if (/credit|billing|quota|rate_limit|too many requests/i.test(message)) {
    message =
      'Claude credits ran out or the request was rate-limited. Add your own Anthropic key in Settings → AI, or pick a cheaper model (Haiku).'
    status = 402
  } else if (/model.*deprecated|model_not_found|invalid.*model/i.test(message)) {
    message =
      'The selected AI model is no longer available. Pick another model in Settings → AI.'
  } else if (message.startsWith('model:')) {
    message = `AI model error (${message.replace('model:', '').trim()}). Pick another model in Settings → AI.`
  }
  const isDev = process.env.NODE_ENV === 'development'
  return NextResponse.json({ error: isDev || status === 402 ? message : fallback }, { status })
}
