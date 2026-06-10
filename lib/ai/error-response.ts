import { NextResponse } from 'next/server'

/** Log and return a JSON error — surfaces real message in development. */
export function aiErrorResponse(err: unknown, fallback: string) {
  console.error('[AI]', err)
  const message = err instanceof Error ? err.message : fallback
  const isDev = process.env.NODE_ENV === 'development'
  return NextResponse.json({ error: isDev ? message : fallback }, { status: 500 })
}
