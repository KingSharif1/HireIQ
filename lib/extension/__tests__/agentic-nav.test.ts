/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { findContinueButton, pageHasIdentityFields } from '@/lib/extension/agentic-nav'

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

  it('finds Apply for this job as a start-gate, not Submit Application', () => {
    document.body.innerHTML = `
      <button type="submit">Submit Application</button>
      <button type="button">Apply for this job</button>
    `
    const hit = findContinueButton(document)
    expect(hit?.label).toBe('Apply for this job')
  })

  it('finds Continue as guest on intro screens', () => {
    document.body.innerHTML = `<button type="button">Continue as guest</button>`
    expect(findContinueButton(document)?.label).toBe('Continue as guest')
  })

  it('finds Workday next via data-automation-id even without Continue text', () => {
    document.body.innerHTML = `<button type="button" data-automation-id="bottom-navigation-next-button">Next</button>`
    const hit = findContinueButton(document)
    expect(hit?.el.getAttribute('data-automation-id')).toBe('bottom-navigation-next-button')
  })
})

describe('pageHasIdentityFields', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('is false on a Continue-only intro page', () => {
    document.body.innerHTML = `<button type="button">Continue</button>`
    expect(pageHasIdentityFields(document)).toBe(false)
  })

  it('is true when a visible email field is on the page', () => {
    document.body.innerHTML = `<input type="email" name="email" />`
    expect(pageHasIdentityFields(document)).toBe(true)
  })
})
