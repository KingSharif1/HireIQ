import { describe, expect, it } from 'vitest'
import { createProcessLog, formatLogTime, mergeProcessLogs } from '@/lib/tailor/process-log'

describe('createProcessLog', () => {
  it('records steps with elapsed ms', () => {
    const log = createProcessLog()
    log.step('One')
    log.step('Two', 'detail')
    log.fail('Three', 'boom')
    expect(log.entries).toHaveLength(3)
    expect(log.entries[2].status).toBe('error')
    expect(log.entries[1].detail).toBe('detail')
  })
})

describe('formatLogTime', () => {
  it('formats sub-second and seconds', () => {
    expect(formatLogTime(450)).toBe('450ms')
    expect(formatLogTime(2400)).toBe('2.4s')
  })
})

describe('mergeProcessLogs', () => {
  it('sorts by ms', () => {
    const merged = mergeProcessLogs(
      [{ id: 'b', at: '', label: 'b', status: 'ok', ms: 200 }],
      [{ id: 'a', at: '', label: 'a', status: 'ok', ms: 100 }]
    )
    expect(merged.map(e => e.id)).toEqual(['a', 'b'])
  })
})
