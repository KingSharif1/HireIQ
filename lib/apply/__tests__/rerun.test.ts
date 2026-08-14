import { describe, expect, it } from 'vitest'
import { applyRerunBlock } from '@/lib/apply/queue'
import type { ApplyRunStatus } from '@/lib/apply/types'

describe('applyRerunBlock', () => {
  it('allows a first run', () => {
    expect(applyRerunBlock(undefined, false)).toBeNull()
  })

  it('blocks overlapping queued/running without needing force', () => {
    expect(applyRerunBlock('queued', true)).toMatch(/already queued or running/)
    expect(applyRerunBlock('running', false)).toMatch(/already queued or running/)
  })

  it('does not auto-retry a finished or failed run', () => {
    for (const status of ['failed', 'applied', 'needs_user'] as ApplyRunStatus[]) {
      expect(applyRerunBlock(status, false)).toMatch(/will not retry/)
    }
  })

  it('allows an explicit new run after failure', () => {
    expect(applyRerunBlock('failed', true)).toBeNull()
    expect(applyRerunBlock('applied', true)).toBeNull()
    expect(applyRerunBlock('needs_user', true)).toBeNull()
  })

  it('allows a new run after cancel without force', () => {
    expect(applyRerunBlock('cancelled', false)).toBeNull()
  })
})
