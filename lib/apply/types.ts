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

/** Live progress written to apply_runs.result while Playwright runs. */
export type ApplyProgressStepId =
  | 'open'
  | 'form'
  | 'identity'
  | 'resume'
  | 'submit'
  | 'done'

export type ApplyProgressStepState = 'pending' | 'active' | 'done' | 'blocked' | 'skipped'

export type ApplyProgressStep = {
  id: ApplyProgressStepId
  label: string
  state: ApplyProgressStepState
  detail?: string
}

export type ApplyProgress = {
  percent: number
  currentStep: ApplyProgressStepId
  steps: ApplyProgressStep[]
  filled: string[]
  notes: string[]
  updatedAt: string
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
  /** Optional live progress sink (Cloud Run → apply_runs.result). */
  onProgress?: (progress: ApplyProgress) => void | Promise<void>
}

export function createInitialApplyProgress(): ApplyProgress {
  const steps: ApplyProgressStep[] = [
    { id: 'open', label: 'Open application page', state: 'pending' },
    { id: 'form', label: 'Find the form', state: 'pending' },
    { id: 'identity', label: 'Fill your details', state: 'pending' },
    { id: 'resume', label: 'Attach resume', state: 'pending' },
    { id: 'submit', label: 'Submit or pause for review', state: 'pending' },
    { id: 'done', label: 'Finish', state: 'pending' },
  ]
  return {
    percent: 0,
    currentStep: 'open',
    steps,
    filled: [],
    notes: [],
    updatedAt: new Date().toISOString(),
  }
}

export function patchApplyProgress(
  prev: ApplyProgress,
  patch: {
    currentStep: ApplyProgressStepId
    stepState?: ApplyProgressStepState
    detail?: string
    filled?: string[]
    notes?: string[]
    percent?: number
    markPreviousDone?: boolean
  }
): ApplyProgress {
  const order: ApplyProgressStepId[] = ['open', 'form', 'identity', 'resume', 'submit', 'done']
  const idx = order.indexOf(patch.currentStep)
  const steps = prev.steps.map(step => {
    const stepIdx = order.indexOf(step.id)
    if (patch.markPreviousDone !== false && stepIdx < idx && step.state !== 'blocked' && step.state !== 'skipped') {
      return { ...step, state: 'done' as const }
    }
    if (step.id === patch.currentStep) {
      return {
        ...step,
        state: patch.stepState ?? 'active',
        detail: patch.detail ?? step.detail,
      }
    }
    return step
  })
  const defaults: Record<ApplyProgressStepId, number> = {
    open: 8,
    form: 22,
    identity: 55,
    resume: 78,
    submit: 90,
    done: 100,
  }
  return {
    percent: patch.percent ?? defaults[patch.currentStep],
    currentStep: patch.currentStep,
    steps,
    filled: patch.filled ?? prev.filled,
    notes: patch.notes ?? prev.notes,
    updatedAt: new Date().toISOString(),
  }
}

export function parseApplyProgress(result: Record<string, unknown> | null | undefined): ApplyProgress | null {
  if (!result || typeof result !== 'object') return null
  const raw = result.progress
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<ApplyProgress>
  if (!Array.isArray(p.steps) || typeof p.percent !== 'number') return null
  return {
    percent: p.percent,
    currentStep: (p.currentStep as ApplyProgressStepId) || 'open',
    steps: p.steps as ApplyProgressStep[],
    filled: Array.isArray(p.filled) ? (p.filled as string[]) : [],
    notes: Array.isArray(p.notes) ? (p.notes as string[]) : [],
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
  }
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
