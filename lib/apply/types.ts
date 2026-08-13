import { detectBoard, type BoardKind } from '@/lib/extension/board'

export type ApplyRunStatus =
  | 'queued'
  | 'running'
  | 'applied'
  | 'failed'
  | 'needs_user'
  | 'cancelled'

export type ApplyRunMode = 'server' | 'extension'

export type ApplyRunRow = {
  id: string
  user_id: string
  job_id: string
  application_id: string | null
  mode: ApplyRunMode
  status: ApplyRunStatus
  complexity: 1 | 3
  board: string | null
  apply_url: string | null
  submit: boolean
  error: string | null
  result: Record<string, unknown>
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export type ApplyIdentityPayload = {
  firstName: string
  lastName: string
  email: string
  phone: string
  linkedin: string
  website: string
}

export type ServerApplyContext = {
  runId: string
  applyUrl: string
  board: BoardKind
  submit: boolean
  identity: ApplyIdentityPayload
  resumePdfUrl: string | null
  jobTitle: string
  company: string
}

/** Portal complexity for pricing / SLA — Workday-like = 3. */
export function estimateApplyComplexity(applyUrl: string): 1 | 3 {
  try {
    const host = new URL(applyUrl).hostname
    const board = detectBoard(host)
    if (board === 'workday') return 3
    return 1
  } catch {
    return 1
  }
}

export function boardFromApplyUrl(applyUrl: string): BoardKind {
  try {
    return detectBoard(new URL(applyUrl).hostname)
  } catch {
    return 'generic'
  }
}
