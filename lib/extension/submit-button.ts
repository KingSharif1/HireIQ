/**
 * Pure helpers for finding / scoring ATS submit controls.
 * Safe for Node tests and extension content scripts.
 */

const BLOCKED_SUBMIT_HOSTS = ['linkedin.com', 'indeed.com']

export function isSubmitAutomationBlocked(urlString: string): boolean {
  try {
    const host = new URL(urlString).hostname.toLowerCase()
    return BLOCKED_SUBMIT_HOSTS.some(h => host === h || host.endsWith(`.${h}`))
  } catch {
    return true
  }
}

/** Higher = better match for the final apply submit (not Next/Continue). */
export function scoreSubmitLabel(label: string): number {
  const t = label.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!t) return 0
  if (/\b(cancel|back|upload|attach|delete|remove|sign out|log out)\b/i.test(t)) return 0
  if (/submit (your )?application|send application|apply for this job/i.test(t)) return 100
  if (/^submit application$/i.test(t)) return 100
  if (/^submit$/i.test(t)) return 85
  if (/^apply( now)?$/i.test(t)) return 80
  if (/submit application/i.test(t)) return 95
  // Multi-step navigation — usable fallback but not preferred
  if (/^(continue|next|save and continue|review)$/i.test(t)) return 35
  if (/\bsubmit\b/i.test(t)) return 60
  return 0
}

export type SubmitLabelHit = {
  label: string
  score: number
}

/** Pick best label from a list (tests + adapters). */
export function pickBestSubmitLabel(labels: string[]): SubmitLabelHit | null {
  let best: SubmitLabelHit | null = null
  for (const label of labels) {
    const score = scoreSubmitLabel(label)
    if (score <= 0) continue
    if (!best || score > best.score) best = { label, score }
  }
  return best
}
