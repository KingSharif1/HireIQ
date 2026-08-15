import { describe, expect, it } from 'vitest'
import { userFacingTailorError } from '@/lib/tailor/user-error'

describe('userFacingTailorError', () => {
  it('maps JSON parse failures to a retryable rewrite error', () => {
    const err = userFacingTailorError(
      `Expected ',' or ']' after array element in JSON at position 9392 (line 125 column 6)`,
    )
    expect(err.title).toMatch(/Couldn’t finish this version/i)
    expect(err.message).toMatch(/rewrite came back/i)
    expect(err.message).not.toMatch(/position 9392/)
    expect(err.canRetry).toBe(true)
  })

  it('maps credit errors without mentioning the model vendor', () => {
    const err = userFacingTailorError('Your credit balance is too low to access this model')
    expect(err.title).toMatch(/credits/i)
    expect(err.message.toLowerCase()).not.toContain('claude')
    expect(err.canRetry).toBe(true)
  })
})
