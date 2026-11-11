import {
  parseApplyProgress,
  type ApplyProgress,
  type ApplyProgressStepId,
  type ApplyRunRow,
  type ApplyRunStatus,
} from '@/lib/apply/types'

/**
 * Human-in-the-loop resume protocol for hosted applies.
 *
 * The worker is a one-shot Playwright process: when it hits a CAPTCHA, an emailed
 * verification code, or a bot-gated submit button it stops with `needs_user` and
 * leaves the progress bar on the blocked step. Resuming therefore means "queue a
 * fresh run once the human has done their part" — never "unpause a process".
 *
 * This module turns a finished run into the exact instruction the UI shows.
 */

export interface BlockedStep {
  stepId: ApplyProgressStepId
  label: string
  detail: string
  /** Plain-language instruction for the user. */
  needs: string
  /** True when simply retrying is enough (no manual action on the employer site). */
  retryIsEnough: boolean
}

const STEP_GUIDANCE: Record<ApplyProgressStepId, { needs: string; retryIsEnough: boolean }> = {
  open: {
    needs: 'Open the posting to confirm it is still live, then retry.',
    retryIsEnough: true,
  },
  form: {
    needs: 'Fill in any required fields the form did not accept, then retry.',
    retryIsEnough: false,
  },
  identity: {
    needs: 'Sign in to the employer portal (or supply the verification code they emailed), then retry.',
    retryIsEnough: false,
  },
  resume: {
    needs: 'Re-attach the resume PDF on the employer form, then retry.',
    retryIsEnough: false,
  },
  submit: {
    needs: 'A person must clear the bot check / click Submit on the employer site, then retry.',
    retryIsEnough: false,
  },
  done: {
    needs: 'Nothing to do — the run finished.',
    retryIsEnough: true,
  },
}

export function findBlockedStep(progress: ApplyProgress | null): BlockedStep | null {
  if (!progress) return null
  const blocked = progress.steps.find((step) => step.state === 'blocked')
  const step = blocked ?? progress.steps.find((s) => s.id === progress.currentStep)
  if (!step) return null
  if (step.state !== 'blocked') return null
  const guidance = STEP_GUIDANCE[step.id]
  return {
    stepId: step.id,
    label: step.label,
    detail: step.detail ?? '',
    needs: guidance.needs,
    retryIsEnough: guidance.retryIsEnough,
  }
}

export interface ResumeAssessment {
  runId: string
  status: ApplyRunStatus
  canResume: boolean
  /** Why resuming is or isn't allowed. */
  reason: string
  blocked: BlockedStep | null
  /** True when the user must act on the employer site before a retry can help. */
  needsManualAction: boolean
}

export function assessResume(
  run: Pick<ApplyRunRow, 'id' | 'status'> & { result?: Record<string, unknown> | null },
): ResumeAssessment {
  const progress = parseApplyProgress(run.result ?? null)
  const blocked = findBlockedStep(progress)

  if (run.status === 'queued' || run.status === 'running') {
    return {
      runId: run.id,
      status: run.status,
      canResume: false,
      reason: 'This apply is still running.',
      blocked,
      needsManualAction: false,
    }
  }

  if (run.status === 'applied') {
    return {
      runId: run.id,
      status: run.status,
      canResume: false,
      reason: 'Already submitted — nothing to resume.',
      blocked,
      needsManualAction: false,
    }
  }

  if (run.status === 'cancelled') {
    return {
      runId: run.id,
      status: run.status,
      canResume: false,
      reason: 'This run was cancelled.',
      blocked,
      needsManualAction: false,
    }
  }

  // needs_user | failed
  return {
    runId: run.id,
    status: run.status,
    canResume: true,
    reason:
      run.status === 'needs_user'
        ? 'Paused for you — complete the step on the employer site, then retry.'
        : 'The last attempt failed; retry to try again.',
    blocked,
    needsManualAction: blocked ? !blocked.retryIsEnough : true,
  }
}
