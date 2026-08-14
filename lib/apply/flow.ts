/**
 * Shared apply-flow rules: walk intro/Continue gates, then fill only what is
 * actually on the page. Never force Submit, hidden fields, or overwrites.
 * Pure — safe for Node tests + Playwright + extension.
 */

export const MAX_CONTINUE_GATES = 6

const SUBMIT_LABEL =
  /^(submit( your)?( application)?|send application|finish application|complete application)$/i

const GATE_EXACT =
  /^(continue|next|proceed|get started|let's get started|lets get started|start application|continue application|go to application|apply|apply now|apply for this job|continue as guest|apply as guest|apply without an account|apply without account|i agree|accept|accept all|accept all cookies|allow cookies|got it)$/i

const GATE_PARTIAL =
  /\b(continue as guest|apply as guest|apply without|save and continue|save & continue|start application|get started|next step)\b/i

/** Cookie / consent — click these so the real apply UI can load. Never "Reject". */
const DISMISS_LABEL = /^(accept( all)?( cookies)?|allow( all)?( cookies)?|agree|got it|ok)$/i

export type ApplyPageAction =
  | 'fill'
  | 'continue'
  | 'dismiss'
  | 'wait_captcha'
  | 'needs_user'
  | 'stop_max_gates'

export type ApplyPageSignals = {
  visibleIdentityFields: number
  hasContinue: boolean
  hasDismiss: boolean
  hasCaptcha: boolean
  gatesClicked: number
}

export type FillApproach =
  | 'skip_hidden'
  | 'skip_disabled'
  | 'already_set'
  | 'skip_overwrite'
  | 'fill'
  | 'type'
  | 'give_up'

export function isSubmitLabel(label: string): boolean {
  const t = label.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!t) return false
  if (SUBMIT_LABEL.test(t)) return true
  if (/^submit\b/.test(t) && !/\b(continue|next)\b/.test(t)) return true
  return false
}

export function isGateLabel(label: string): boolean {
  const t = label.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!t) return false
  if (isSubmitLabel(t)) return false
  if (/\b(sign in|log in|create account|register|upload|attach|cancel|back|reject|decline)\b/.test(t)) {
    return false
  }
  return GATE_EXACT.test(t) || GATE_PARTIAL.test(t)
}

export function isDismissLabel(label: string): boolean {
  const t = label.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!t) return false
  if (isSubmitLabel(t) || /\b(reject|decline|deny)\b/.test(t)) return false
  return DISMISS_LABEL.test(t)
}

/**
 * What to do on this page. Fill only when identity fields are visible.
 * Intro ATS flows often have several Continue screens before any inputs.
 */
export function nextApplyAction(signals: ApplyPageSignals): ApplyPageAction {
  if (signals.hasCaptcha) return 'wait_captcha'
  if (signals.visibleIdentityFields > 0) return 'fill'
  if (signals.gatesClicked >= MAX_CONTINUE_GATES) return 'stop_max_gates'
  if (signals.hasDismiss) return 'dismiss'
  if (signals.hasContinue) return 'continue'
  return 'needs_user'
}

/**
 * How to put a value in a field. Never force hidden/disabled inputs or
 * overwrite a different value the site (or user) already set.
 */
export function nextFillApproach(opts: {
  visible: boolean
  disabled: boolean
  current: string
  desired: string
  tried: Array<'fill' | 'type'>
}): FillApproach {
  if (!opts.visible) return 'skip_hidden'
  if (opts.disabled) return 'skip_disabled'
  const current = opts.current.trim()
  const desired = opts.desired.trim()
  if (!desired) return 'give_up'
  if (current === desired) return 'already_set'
  if (current && current !== desired) return 'skip_overwrite'
  if (!opts.tried.includes('fill')) return 'fill'
  if (!opts.tried.includes('type')) return 'type'
  return 'give_up'
}
