export type TailorLogStatus = 'pending' | 'ok' | 'warn' | 'error'

export interface TailorProcessLogEntry {
  id: string
  at: string
  label: string
  detail?: string
  status: TailorLogStatus
  /** Elapsed ms since log started */
  ms?: number
}

export function createProcessLog() {
  const started = Date.now()
  const entries: TailorProcessLogEntry[] = []

  function step(label: string, detail?: string, status: TailorLogStatus = 'ok') {
    entries.push({
      id: `s${entries.length}`,
      at: new Date().toISOString(),
      label,
      detail,
      status,
      ms: Date.now() - started,
    })
  }

  function fail(label: string, detail: string) {
    const pending = [...entries].reverse().find(e => e.status === 'pending')
    if (pending) {
      pending.status = 'error'
      pending.label = label
      pending.detail = detail
      pending.ms = Date.now() - started
      return
    }
    step(label, detail, 'error')
  }

  return { entries, step, fail }
}

export function mergeProcessLogs(...groups: TailorProcessLogEntry[][]): TailorProcessLogEntry[] {
  return groups.flat().sort((a, b) => (a.ms ?? 0) - (b.ms ?? 0))
}

export function formatLogTime(ms?: number): string {
  if (ms == null) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
