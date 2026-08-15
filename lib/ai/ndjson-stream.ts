/** NDJSON event stream helpers for linear AI routes (progress → done | error). */

export type NdjsonProgress = { type: 'progress'; detail: string }
export type NdjsonDone<T extends Record<string, unknown>> = { type: 'done' } & T
export type NdjsonError = { type: 'error'; error: string }
export type NdjsonEvent<T extends Record<string, unknown>> =
  | NdjsonProgress
  | NdjsonDone<T>
  | NdjsonError

export function ndjsonResponse<T extends Record<string, unknown>>(
  run: (emit: (event: NdjsonEvent<T>) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: NdjsonEvent<T>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }
      try {
        await run(emit)
      } catch (err) {
        emit({
          type: 'error',
          error: err instanceof Error ? err.message : 'Something went wrong',
        })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function readNdjsonResponse<T extends Record<string, unknown>>(
  res: Response,
  onProgress?: (detail: string) => void,
): Promise<T> {
  if (!res.body) {
    const fallback = (await res.json()) as NdjsonEvent<T> | T
    if (fallback && typeof fallback === 'object' && 'type' in fallback) {
      const ev = fallback as NdjsonEvent<T>
      if (ev.type === 'error') throw new Error(ev.error)
      if (ev.type === 'done') {
        const { type: _t, ...rest } = ev
        return rest as unknown as T
      }
    }
    return fallback as T
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done: T | null = null
  let streamError: string | null = null

  while (true) {
    const { value, done: eof } = await reader.read()
    if (eof) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      let event: NdjsonEvent<T>
      try {
        event = JSON.parse(trimmed) as NdjsonEvent<T>
      } catch {
        continue
      }
      if (event.type === 'progress') onProgress?.(event.detail)
      else if (event.type === 'error') streamError = event.error
      else if (event.type === 'done') {
        const { type: _t, ...rest } = event
        done = rest as unknown as T
      }
    }
  }

  if (streamError) throw new Error(streamError)
  if (!done) throw new Error(res.ok ? 'No result from server' : `Request failed (${res.status})`)
  return done
}

/** Lightweight progress while a job-analysis JSON blob streams in. */
export function streamingJobProgress(partial: string): string {
  const t = partial.toLowerCase()
  if (t.includes('summary')) return 'Writing role summary'
  if (t.includes('responsibilities')) return 'Extracting responsibilities'
  if (t.includes('preferred_skills')) return 'Finding preferred skills'
  if (t.includes('required_skills')) return 'Extracting required skills'
  if (t.includes('keywords')) return 'Pulling keywords'
  if (t.includes('title')) return 'Reading job title'
  return 'Analyzing this job'
}
