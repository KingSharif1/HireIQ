import type { GapAnalysis, GapQuestion } from '@/types'
import type { TailorProcessLogEntry } from '@/lib/tailor/process-log'

/** Paid Claude calls for one tailor session. Never more. Never overlapping. */
export const TAILOR_RUN_CLAUDE = {
  gap: 1,
  generate: 1,
  total: 2,
} as const

/** Longer than route `maxDuration` (120s) so we only fail after the worker is gone. */
export const TAILOR_RUN_STALE_MS = 3 * 60 * 1000

export const TAILOR_RUN_ACTIVE_STATUSES = [
  'analyzing_gaps',
  'awaiting_answers',
  'generating',
] as const

export type TailorRunStatus =
  | 'analyzing_gaps'
  | 'awaiting_answers'
  | 'generating'
  | 'needs_review'
  | 'failed'
  | 'cancelled'

export type TailorRunRow = {
  id: string
  user_id: string
  job_id: string
  status: TailorRunStatus
  process_log: TailorProcessLogEntry[]
  gap_analysis: GapAnalysis | null
  questions: GapQuestion[]
  answers: Record<string, string>
  tailored_resume_id: string | null
  error: string | null
  gap_reserved: boolean
  generate_reserved: boolean
  claude_calls: number
  created_at: string
  updated_at: string
  finished_at: string | null
}

export function isActiveTailorStatus(status: string): boolean {
  return (TAILOR_RUN_ACTIVE_STATUSES as readonly string[]).includes(status)
}

export function isBusyTailorStatus(status: string): boolean {
  return status === 'analyzing_gaps' || status === 'generating'
}

export function tailorRunLabel(status: TailorRunStatus | null | undefined): string | null {
  switch (status) {
    case 'analyzing_gaps':
      return 'Finding gaps…'
    case 'awaiting_answers':
      return 'Needs your answers'
    case 'generating':
      return 'Tailoring…'
    case 'needs_review':
      return 'Needs review'
    case 'failed':
      return 'Tailor failed'
    default:
      return null
  }
}

/** Attach to an existing run instead of starting another paid session. */
export function shouldAttachToRun(status: TailorRunStatus | null | undefined): boolean {
  return (
    status === 'analyzing_gaps' ||
    status === 'awaiting_answers' ||
    status === 'generating' ||
    status === 'needs_review'
  )
}

/** Resume a crashed-before-start worker. Never true once Claude was reserved. */
export function shouldKickGapWorker(run: {
  status: string
  gap_reserved: boolean
}): boolean {
  return run.status === 'analyzing_gaps' && !run.gap_reserved
}

/** How many Claude calls this session is allowed to make. */
export function claudeCallsForSession(hasMaterialGaps: boolean): number {
  return hasMaterialGaps ? TAILOR_RUN_CLAUDE.total : TAILOR_RUN_CLAUDE.generate
}

export function isStaleBusyRun(
  run: { status: string; updated_at: string },
  nowMs = Date.now(),
  staleMs = TAILOR_RUN_STALE_MS,
): boolean {
  if (!isBusyTailorStatus(run.status)) return false
  const updated = Date.parse(run.updated_at)
  if (!Number.isFinite(updated)) return false
  return nowMs - updated > staleMs
}

export function tailorDocumentsHref(jobId: string): string {
  return `/dashboard/tracker/${jobId}?tab=documents&docMode=ai-tailor`
}
