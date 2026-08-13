import { describe, expect, it, vi, afterEach } from 'vitest'
import { listGmailHistoryChanges } from '@/lib/google/gmail'

describe('listGmailHistoryChanges', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('collects message ids from history records', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          historyId: '999',
          history: [
            { messagesAdded: [{ message: { id: 'a' } }, { message: { id: 'b' } }] },
            { messages: [{ id: 'c' }] },
          ],
        }),
      } as Response),
    )

    const result = await listGmailHistoryChanges('token', '100')
    expect(result.expired).toBe(false)
    expect(result.latestHistoryId).toBe('999')
    expect(result.messageIds.sort()).toEqual(['a', 'b', 'c'])
  })

  it('returns expired when history id is too old', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Not Found', code: 404 } }),
      } as Response),
    )

    const result = await listGmailHistoryChanges('token', '1')
    expect(result.expired).toBe(true)
    expect(result.messageIds).toEqual([])
  })
})
