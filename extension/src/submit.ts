import {
  isSubmitAutomationBlocked,
  scoreSubmitLabel,
} from '../../lib/extension/submit-button'
import { distinctiveSubmitSelectors } from '../../lib/extension/board'

export { isSubmitAutomationBlocked, scoreSubmitLabel }

function controlLabel(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement) {
    const v = (el.value || '').trim()
    if (v) return v
  }
  const aria = el.getAttribute('aria-label')?.trim()
  if (aria) return aria
  const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
  return text.slice(0, 120)
}

export type FoundSubmit = {
  el: HTMLElement
  label: string
  score: number
}

/** Find the best visible submit / apply control on the page. */
export function findSubmitButton(doc: Document = document): FoundSubmit | null {
  let best: FoundSubmit | null = null

  for (const sel of distinctiveSubmitSelectors()) {
    for (const node of Array.from(doc.querySelectorAll(sel))) {
      if (!(node instanceof HTMLElement)) continue
      if (node instanceof HTMLInputElement && node.type === 'hidden') continue
      const r = node.getBoundingClientRect()
      if (r.width < 2 && r.height < 2 && node.offsetParent === null) {
        // jsdom: still consider in-document distinctive ATS buttons
      } else if (r.width < 2 && r.height < 2) {
        continue
      }
      if ((node as HTMLButtonElement).disabled) continue
      const label = controlLabel(node)
      const score = Math.max(scoreSubmitLabel(label), 90)
      if (!best || score > best.score) best = { el: node, label: label || sel, score }
    }
  }

  const nodes = [
    ...doc.querySelectorAll(
      'button, input[type="submit"], input[type="button"], [role="button"], a.button, a[class*="btn"]',
    ),
  ] as HTMLElement[]

  for (const el of nodes) {
    if (el instanceof HTMLInputElement && el.type === 'hidden') continue
    const r = el.getBoundingClientRect()
    // allow slightly offscreen (sticky footers)
    if (r.width < 2 && r.height < 2) continue
    if ((el as HTMLButtonElement).disabled) continue
    const label = controlLabel(el)
    const score = scoreSubmitLabel(label)
    if (score <= 0) continue
    if (!best || score > best.score) best = { el, label, score }
  }
  return best
}

/** Scroll, flash, and click the site submit control. Does not auto-run — caller must invoke. */
export function clickSubmitButton(found: FoundSubmit): void {
  found.el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  found.el.style.outline = '3px solid #0d9488'
  found.el.style.outlineOffset = '3px'
  found.el.click()
}
