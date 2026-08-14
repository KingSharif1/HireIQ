import { distinctiveContinueSelectors } from './board'
import { isGateLabel, isSubmitLabel } from '@/lib/apply/flow'

const CONTINUE_LABEL =
  /^(continue|next|proceed|save and continue|save & continue|continue application|go to application|start application|apply|apply now|apply for this job|get started|continue as guest)$/i

const CONTINUE_PARTIAL =
  /\b(continue|next step|proceed|save and continue|save & continue|start application|apply for this job|continue as guest)\b/i

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false
  if ((el instanceof HTMLButtonElement || el instanceof HTMLInputElement) && el.disabled) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0 && !el.offsetParent && el.tagName !== 'BODY') {
    // jsdom — treat in-document buttons as visible when not explicitly hidden
    return style.display !== 'none' && style.visibility !== 'hidden'
  }
  return rect.width > 2 && rect.height > 2
}

function labelFor(el: Element): string {
  if (el instanceof HTMLInputElement && (el.type === 'submit' || el.type === 'button')) {
    return (el.value || '').trim()
  }
  return (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()
}

function scoreContinue(el: Element): number {
  const label = labelFor(el)
  if (!label) return 0
  if (isSubmitLabel(label)) return 0
  let score = 0
  if (isGateLabel(label) || CONTINUE_LABEL.test(label)) score += 10
  else if (CONTINUE_PARTIAL.test(label)) score += 6
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) score += 2
  if (el.getAttribute('type') === 'submit') score += 1
  return score
}

export function findContinueButton(doc: Document): { el: HTMLElement; label: string } | null {
  for (const sel of distinctiveContinueSelectors()) {
    const el = doc.querySelector(sel)
    if (el instanceof HTMLElement && isVisible(el)) {
      return { el, label: labelFor(el) || 'Continue' }
    }
  }

  const candidates = Array.from(
    doc.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]'),
  ).filter(isVisible)

  let best: { el: HTMLElement; label: string; score: number } | null = null
  for (const el of candidates) {
    const score = scoreContinue(el)
    if (score <= 0) continue
    const label = labelFor(el)
    if (!best || score > best.score) {
      best = { el: el as HTMLElement, label, score }
    }
  }

  return best ? { el: best.el, label: best.label } : null
}

export function clickContinueButton(found: { el: HTMLElement }): void {
  found.el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  found.el.click()
}

const IDENTITY_FIELD_SELECTOR = [
  'input[type="email"]',
  'input[autocomplete="email"]',
  'input[autocomplete="given-name"]',
  'input[name="first_name"]',
  'input[name="job_application[first_name]"]',
  'input[name="email"]',
  'input[type="tel"]',
  'input[autocomplete="family-name"]',
].join(', ')

function isVisibleField(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el instanceof HTMLInputElement && (el.type === 'hidden' || el.disabled)) return false
  return isVisible(el)
}

/** True when this page actually has name/email fields — not just another Continue screen. */
export function pageHasIdentityFields(doc: Document): boolean {
  return Array.from(doc.querySelectorAll(IDENTITY_FIELD_SELECTOR)).some(isVisibleField)
}
