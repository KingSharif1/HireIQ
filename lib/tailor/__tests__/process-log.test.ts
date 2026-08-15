import { describe, expect, it } from 'vitest'
import { createProcessLog } from '@/lib/tailor/process-log'

describe('createProcessLog', () => {
  it('turns the pending step into the error instead of leaving a spinner', () => {
    const log = createProcessLog()
    log.step('Reviewing this job', 'Comparing', 'pending')
    log.fail('Couldn’t finish this version', 'The rewrite came back in a form we couldn’t use.')
    expect(log.entries).toHaveLength(1)
    expect(log.entries[0].status).toBe('error')
    expect(log.entries[0].label).toBe('Couldn’t finish this version')
    expect(log.entries[0].detail).not.toMatch(/JSON/)
  })
})
