/**
 * Hard rule: paid AI / apply actions run ONCE.
 * If a call is already in flight or it fails — stop. Do not retry or "fix it" with more credits.
 */

export const AI_IN_FLIGHT_MESSAGE =
  'This action is already running. We will not start another paid call.'

export class AiInFlightError extends Error {
  readonly status = 429
  constructor(message = AI_IN_FLIGHT_MESSAGE) {
    super(message)
    this.name = 'AiInFlightError'
  }
}

const inflight = new Set<string>()

export function beginAiOnce(key: string): boolean {
  if (inflight.has(key)) return false
  inflight.add(key)
  return true
}

export function endAiOnce(key: string): void {
  inflight.delete(key)
}

export async function withAiOnce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!beginAiOnce(key)) throw new AiInFlightError()
  try {
    return await fn()
  } finally {
    endAiOnce(key)
  }
}
