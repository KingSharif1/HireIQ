/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { findContinueButton } from '@/lib/extension/agentic-nav'

describe('findContinueButton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('finds a visible Continue button', () => {
    document.body.innerHTML = `
      <button type="button">Back</button>
      <button type="button">Continue</button>
    `
    const hit = findContinueButton(document)
    expect(hit?.label).toBe('Continue')
  })

  it('ignores hidden controls', () => {
    document.body.innerHTML = `<button type="button" style="display:none">Continue</button>`
    expect(findContinueButton(document)).toBeNull()
  })
})
