import type { ApplicationStatus } from '@/types'

export type JobMatchCandidate = {
  jobId: string
  applicationId: string
  company: string
  title: string
}

export type StatusHint = {
  status: ApplicationStatus
  confidence: number
  reason: string
}

/** Simple keyword hints for employer mail (v1 — no LLM). */
export function inferStatusFromEmail(subject: string, bodyPreview: string): StatusHint | null {
  const text = `${subject}\n${bodyPreview}`.toLowerCase()

  if (/\b(offer|congratulations[,.]?\s+you('ve| have)\s+been\s+selected)\b/.test(text)) {
    return { status: 'offer', confidence: 0.75, reason: 'offer keywords' }
  }
  if (/\b(interview|schedule a call|speak with you|phone screen)\b/.test(text)) {
    return { status: 'interviewing', confidence: 0.7, reason: 'interview keywords' }
  }
  if (
    /\b(unfortunately|not moving forward|other candidates|will not be progressing)\b/.test(text)
  ) {
    return { status: 'rejected', confidence: 0.7, reason: 'rejection keywords' }
  }
  if (/\b(thank you for (your )?applying|we received your application|application received)\b/.test(text)) {
    return { status: 'applied', confidence: 0.65, reason: 'confirmation keywords' }
  }
  return null
}

function companyTokens(company: string): string[] {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !['inc', 'llc', 'ltd', 'the', 'and', 'corp', 'company'].includes(t))
}

function domainFromEmail(from: string): string {
  const bare = from.includes('<') ? (from.match(/<([^>]+)>/)?.[1] ?? from) : from
  const host = bare.split('@')[1]?.toLowerCase() ?? ''
  return host.replace(/^mail\./, '').replace(/^email\./, '')
}

/**
 * Pick best open application for an inbound employer email.
 * Prefer company name in subject/from; then from-domain token overlap.
 */
export function matchInboundToJob(
  candidates: readonly JobMatchCandidate[],
  opts: { from: string; subject: string; bodyPreview?: string }
): { match: JobMatchCandidate; score: number } | null {
  if (candidates.length === 0) return null

  const subject = opts.subject.toLowerCase()
  const body = (opts.bodyPreview ?? '').toLowerCase()
  const hay = `${subject}\n${body}\n${opts.from.toLowerCase()}`
  const fromDomain = domainFromEmail(opts.from)
  const domainRoot = fromDomain.split('.')[0] ?? ''

  let best: { match: JobMatchCandidate; score: number } | null = null

  for (const c of candidates) {
    let score = 0
    const company = c.company.trim()
    if (!company) continue
    const lower = company.toLowerCase()
    if (subject.includes(lower) || hay.includes(lower)) score += 5
    for (const token of companyTokens(company)) {
      if (subject.includes(token)) score += 2
      if (hay.includes(token)) score += 1
      if (domainRoot && (token.includes(domainRoot) || domainRoot.includes(token))) score += 3
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { match: c, score }
    }
  }

  if (!best || best.score < 3) return null
  return best
}
