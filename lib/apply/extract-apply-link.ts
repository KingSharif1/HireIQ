import { detectJobUrlKind } from '@/lib/jobs/url-detect'

const APPLY_TEXT =
  /\b(apply now|apply for this|apply online|submit application|start application|apply to this|easy apply)\b/i

const SKIP_TEXT =
  /\b(linkedin|indeed|glassdoor|ziprecruiter|share|tweet|email a friend|save job|view all jobs)\b/i

function resolveHref(href: string, pageUrl: string): string | null {
  const trimmed = href.trim()
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('javascript:') || trimmed.startsWith('mailto:')) {
    return null
  }
  try {
    return new URL(trimmed, pageUrl).toString()
  } catch {
    return null
  }
}

function scoreApplyCandidate(input: { url: string; text: string; pageUrl: string }): number {
  let score = 0
  const kind = detectJobUrlKind(input.url)
  if (kind === 'greenhouse' || kind === 'lever' || kind === 'ashby') score += 80
  if (kind === 'workday' || kind === 'linkedin' || kind === 'aggregator') score -= 40

  if (APPLY_TEXT.test(input.text)) score += 40
  if (/\/apply\b|\/application\b|\/job-application\b|gh_jid=/i.test(input.url)) score += 30
  if (input.text.trim().length > 0 && input.text.trim().length <= 40) score += 10

  try {
    const pageHost = new URL(input.pageUrl).hostname
    const linkHost = new URL(input.url).hostname
    if (pageHost === linkHost) score += 8
  } catch {
    /* ignore */
  }

  if (SKIP_TEXT.test(input.text) || SKIP_TEXT.test(input.url)) score -= 50
  return score
}

/**
 * Find the most likely "Apply" link on a job posting page when the page URL
 * is a description page rather than the apply form itself.
 */
export function extractApplyLinkFromHtml(html: string, pageUrl: string): string | null {
  if (!html.trim() || !pageUrl.trim()) return null

  const linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const buttonRe = /<button\b[^>]*>([\s\S]*?)<\/button>[\s\S]{0,400}?<a\b[^>]*href=["']([^"']+)["']/gi

  const candidates: Array<{ url: string; text: string; score: number }> = []

  for (const match of html.matchAll(linkRe)) {
    const href = match[1]
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const url = resolveHref(href, pageUrl)
    if (!url) continue
    const score = scoreApplyCandidate({ url, text, pageUrl })
    if (score >= 25) candidates.push({ url, text, score })
  }

  for (const match of html.matchAll(buttonRe)) {
    const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const url = resolveHref(match[2], pageUrl)
    if (!url) continue
    const score = scoreApplyCandidate({ url, text, pageUrl })
    if (score >= 25) candidates.push({ url, text, score })
  }

  if (!candidates.length) return null
  candidates.sort((a, b) => b.score - a.score)
  return candidates[0].url
}
