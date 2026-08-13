/**
 * Learnable host-specific fetch rules.
 *
 * When a new careers site fails generic extraction, add a rule here (or a dedicated
 * mapper in extractors/host-rules.ts). Each rule documents why it exists so future
 * agents can extend the registry without re-discovering the same pattern.
 *
 * Rule types:
 * - hydration-json — SPA embeds job JSON in a script tag (Apple, some React Router sites)
 * - json-ld — schema.org JobPosting in page head
 * - html-selectors — known DOM selectors for static/SSR pages
 */

export type HostRuleType = 'hydration-json' | 'json-ld' | 'html-selectors'

export type HostFetchRule = {
  id: string
  /** Hostname regex (test against URL hostname). */
  hostPattern: RegExp
  type: HostRuleType
  /** Human note for maintainers — what broke and how this rule fixes it. */
  notes: string
  addedAt: string
}

/** Ordered registry — first matching host rule wins for host-specific hints. */
export const HOST_FETCH_RULES: HostFetchRule[] = [
  {
    id: 'apple-jobs-hydration',
    hostPattern: /(^|\.)jobs\.apple\.com$/i,
    type: 'hydration-json',
    notes:
      'Apple careers SPA renders a spinner in #jobdetails-wrapper; full JD lives in window.__staticRouterHydrationData.loaderData.jobDetails.jobsData (added 2026-08-13).',
    addedAt: '2026-08-13',
  },
]

export function matchHostRule(url: string): HostFetchRule | null {
  try {
    const hostname = new URL(url.trim()).hostname
    return HOST_FETCH_RULES.find(rule => rule.hostPattern.test(hostname)) ?? null
  } catch {
    return null
  }
}
