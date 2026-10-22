import { normalizeApplyUrl } from '@/lib/extension/normalize-url'
import { canonicalAlertUrl } from '@/lib/scout/job-alert-email'
import { isSafeFetchTarget } from '@/lib/scout/liveness'

const URL_RE = /https?:\/\/[^\s<>"'`\\]+/gi

/** Pull job links out of pasted text (a list, a table, an email). Deduped and capped. */
export function parsePastedUrls(text: string, max = 10): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const match of (text ?? '').matchAll(URL_RE)) {
    const raw = match[0].replace(/[)\]}>.,;:!?|*_]+$/g, '')
    const canon = canonicalAlertUrl(raw)
    const url = canon ? canon.url : raw
    if (!isSafeFetchTarget(url)) continue
    let key: string
    try {
      key = normalizeApplyUrl(url)
    } catch {
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    out.push(url)
    if (out.length >= max) break
  }
  return out
}
