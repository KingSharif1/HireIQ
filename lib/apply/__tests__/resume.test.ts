import { describe, it, expect } from 'vitest'
import { findBlockedStep, assessResume } from '@/lib/apply/resume'
import { createInitialApplyProgress, type ApplyProgress } from '@/lib/apply/types'

function progressWithBlocked(id: 'open' | 'form' | 'identity' | 'resume' | 'submit'): ApplyProgress {
  const progress = createInitialApplyProgress()
  return {
    ...progress,
    currentStep: id,
    steps: progress.steps.map((step) =>
      step.id === id
        ? { ...step, state: 'blocked' as const, detail: 'bot check blocked the click' }
        : step,
    ),
  }
}

describe('findBlockedStep', () => {
  it('returns null when nothing is blocked', () => {
    expect(findBlockedStep(createInitialApplyProgress())).toBeNull()
    expect(findBlockedStep(null)).toBeNull()
  })

  it('describes a blocked submit step as needing a human', () => {
    const blocked = findBlockedStep(progressWithBlocked('submit'))
    expect(blocked?.stepId).toBe('submit')
    expect(blocked?.retryIsEnough).toBe(false)
    expect(blocked?.needs).toMatch(/clear the bot check/i)
    expect(blocked?.detail).toBe('bot check blocked the click')
  })

  it('treats a blocked open step as retry-only', () => {
    const blocked = findBlockedStep(progressWithBlocked('open'))
    expect(blocked?.retryIsEnough).toBe(true)
  })

  it('flags identity as needing the user to sign in', () => {
    const blocked = findBlockedStep(progressWithBlocked('identity'))
    expect(blocked?.needs).toMatch(/verification code|sign in/i)
    expect(blocked?.retryIsEnough).toBe(false)
  })
})

describe('assessResume', () => {
  it('allows resuming a needs_user run and points at the blocked step', () => {
    const assessment = assessResume({
      id: 'run-1',
      status: 'needs_user',
      result: { progress: progressWithBlocked('submit') },
    })
    expect(assessment.canResume).toBe(true)
    expect(assessment.blocked?.stepId).toBe('submit')
    expect(assessment.needsManualAction).toBe(true)
  })

  it('allows resuming a failed run', () => {
    const assessment = assessResume({ id: 'run-1', status: 'failed', result: {} })
    expect(assessment.canResume).toBe(true)
    expect(assessment.reason).toMatch(/failed/i)
  })

  it('refuses while still running', () => {
    for (const status of ['queued', 'running'] as const) {
      const assessment = assessResume({ id: 'run-1', status, result: {} })
      expect(assessment.canResume).toBe(false)
      expect(assessment.reason).toMatch(/still running/i)
    }
  })

  it('refuses once submitted', () => {
    const assessment = assessResume({ id: 'run-1', status: 'applied', result: {} })
    expect(assessment.canResume).toBe(false)
    expect(assessment.reason).toMatch(/already submitted/i)
  })

  it('refuses a cancelled run', () => {
    const assessment = assessResume({ id: 'run-1', status: 'cancelled', result: {} })
    expect(assessment.canResume).toBe(false)
  })

  it('handles a null result without crashing', () => {
    const assessment = assessResume({ id: 'run-1', status: 'needs_user', result: null })
    expect(assessment.canResume).toBe(true)
    expect(assessment.blocked).toBeNull()
  })
})
