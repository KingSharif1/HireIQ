import { NextResponse } from 'next/server'
import { AiConfigError } from '@/lib/ai/runtime'
import { AiInFlightError } from '@/lib/ai/once'
import type { TailorProcessLogEntry } from '@/lib/tailor/process-log'
import { userFacingTailorError } from '@/lib/tailor/user-error'

/** Log and return a JSON error — surfaces real message in development. */
export function aiErrorResponse(
  err: unknown,
  fallback: string,
  processLog?: TailorProcessLogEntry[],
) {
  console.error('[AI]', err)
  if (err instanceof AiInFlightError) {
    return NextResponse.json({ error: err.message, processLog }, { status: 429 })
  }
  if (err instanceof AiConfigError) {
    return NextResponse.json(
      { error: err.message, processLog },
      { status: err.status },
    )
  }
  let message = err instanceof Error ? err.message : fallback
  let status = 500
  if (/credit|billing|quota|rate_limit|too many requests/i.test(message)) {
    status = 402
  }
  const facing = userFacingTailorError(message)
  const isDev = process.env.NODE_ENV === 'development'
  const showDetail = isDev || status === 402 || Boolean(processLog?.length)
  return NextResponse.json(
    { error: showDetail ? facing.message : fallback, processLog },
    { status },
  )
}
