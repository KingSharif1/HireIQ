import { NextResponse } from 'next/server'

/** Log and return a JSON error — surfaces real message in development. */
export function aiErrorResponse(err: unknown, fallback: string) {
  console.error('[AI]', err)
  let message = err instanceof Error ? err.message : fallback
  // Anthropic returns terse model errors — make them readable in the UI.
  if (/model.*deprecated|model_not_found|invalid.*model/i.test(message)) {
    message = 'The AI model configured for this step is no longer available. Please update AI_MODELS in lib/ai/models.ts.'
  } else if (message.startsWith('model:')) {
    message = `AI model error (${message.replace('model:', '').trim()}). The model may be retired — check lib/ai/models.ts.`
  }
  const isDev = process.env.NODE_ENV === 'development'
  return NextResponse.json({ error: isDev ? message : fallback }, { status: 500 })
}
