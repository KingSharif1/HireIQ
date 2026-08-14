import { describe, expect, it } from 'vitest'
import {
  isDismissLabel,
  isGateLabel,
  isSubmitLabel,
  MAX_CONTINUE_GATES,
  nextApplyAction,
  nextFillApproach,
} from '@/lib/apply/flow'

describe('apply labels', () => {
  it('treats Continue / Apply / guest as gates, never Submit', () => {
    expect(isGateLabel('Continue')).toBe(true)
    expect(isGateLabel('Next')).toBe(true)
    expect(isGateLabel('Start application')).toBe(true)
    expect(isGateLabel('Apply for this job')).toBe(true)
    expect(isGateLabel('Continue as guest')).toBe(true)
    expect(isGateLabel('Get started')).toBe(true)
    expect(isSubmitLabel('Submit Application')).toBe(true)
    expect(isGateLabel('Submit Application')).toBe(false)
    expect(isGateLabel('Submit')).toBe(false)
    expect(isGateLabel('Sign in')).toBe(false)
    expect(isGateLabel('Create account')).toBe(false)
  })

  it('accepts cookie banners without treating Reject as a gate', () => {
    expect(isDismissLabel('Accept all cookies')).toBe(true)
    expect(isDismissLabel('Reject')).toBe(false)
    expect(isGateLabel('Accept all cookies')).toBe(true)
  })
})

describe('nextApplyAction', () => {
  it('walks a few Continue pages before any fields exist', () => {
    let gatesClicked = 0
    const clicks: string[] = []
    for (let i = 0; i < 8; i++) {
      const action = nextApplyAction({
        visibleIdentityFields: 0,
        hasContinue: true,
        hasDismiss: false,
        hasCaptcha: false,
        gatesClicked,
      })
      if (action === 'continue') {
        clicks.push(action)
        gatesClicked += 1
        continue
      }
      expect(action).toBe('stop_max_gates')
      break
    }
    expect(clicks).toHaveLength(MAX_CONTINUE_GATES)
    expect(gatesClicked).toBe(MAX_CONTINUE_GATES)
  })

  it('fills as soon as identity fields appear, even if Continue is also present', () => {
    expect(
      nextApplyAction({
        visibleIdentityFields: 2,
        hasContinue: true,
        hasDismiss: false,
        hasCaptcha: false,
        gatesClicked: 3,
      }),
    ).toBe('fill')
  })

  it('does not invent a path when there is no form and no Continue', () => {
    expect(
      nextApplyAction({
        visibleIdentityFields: 0,
        hasContinue: false,
        hasDismiss: false,
        hasCaptcha: false,
        gatesClicked: 0,
      }),
    ).toBe('needs_user')
  })

  it('stops on CAPTCHA instead of forcing through', () => {
    expect(
      nextApplyAction({
        visibleIdentityFields: 0,
        hasContinue: true,
        hasDismiss: false,
        hasCaptcha: true,
        gatesClicked: 0,
      }),
    ).toBe('wait_captcha')
  })
})

describe('nextFillApproach', () => {
  it('does not force hidden, disabled, or already-different values', () => {
    expect(
      nextFillApproach({
        visible: false,
        disabled: false,
        current: '',
        desired: 'Ada',
        tried: [],
      }),
    ).toBe('skip_hidden')
    expect(
      nextFillApproach({
        visible: true,
        disabled: true,
        current: '',
        desired: 'Ada',
        tried: [],
      }),
    ).toBe('skip_disabled')
    expect(
      nextFillApproach({
        visible: true,
        disabled: false,
        current: 'Other',
        desired: 'Ada',
        tried: [],
      }),
    ).toBe('skip_overwrite')
  })

  it('tries fill, then type, then gives up', () => {
    const base = {
      visible: true,
      disabled: false,
      current: '',
      desired: 'Ada',
    }
    expect(nextFillApproach({ ...base, tried: [] })).toBe('fill')
    expect(nextFillApproach({ ...base, tried: ['fill'] })).toBe('type')
    expect(nextFillApproach({ ...base, tried: ['fill', 'type'] })).toBe('give_up')
    expect(nextFillApproach({ ...base, current: 'Ada', tried: [] })).toBe('already_set')
  })
})
