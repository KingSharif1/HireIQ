import type { LinkedInConnection } from '@/types'

/**
 * Match the user's LinkedIn connections to a target company and rank referral
 * strength. Pure + deterministic — the same "job-relevance" idea applied to
 * people. Claude can refine the fuzzy cases later; this gives a solid first pass
 * and a human-readable reason for every surfacing.
 */

export interface ReferralMatch {
  connection: LinkedInConnection
  /** 0..1 — how strong a referral source this connection is for the company. */
  strength: number
  reason: string
}

const STOPWORDS = new Set([
  'inc', 'llc', 'ltd', 'corp', 'company', 'co', 'the', 'and', 'group', 'technologies',
  'technology', 'tech', 'llp', 'pllc', 'incorporated', 'corporation',
])

function normalizeCompany(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function companyTokens(raw: string): string[] {
  return normalizeCompany(raw)
    .split(' ')
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
}

/** 0..1 similarity between two company names. */
export function companyMatchScore(connectionCompany: string, targetCompany: string): number {
  const a = normalizeCompany(connectionCompany)
  const b = normalizeCompany(targetCompany)
  if (!a || !b) return 0

  const ta = companyTokens(connectionCompany)
  const tb = companyTokens(targetCompany)

  // Exact after stripping legal suffixes / stopwords.
  if (ta.length > 0 && ta.join(' ') === tb.join(' ')) return 1
  if (a === b) return 1

  if (a.includes(b) || b.includes(a)) return 0.85

  if (ta.length === 0 || tb.length === 0) return 0

  const overlap = ta.filter((t) => tb.includes(t)).length
  const union = new Set([...ta, ...tb]).size
  // All target tokens present in the connection's company = strong sub-match.
  if (tb.every((t) => ta.includes(t))) return 0.8
  const jaccard = overlap / union
  return jaccard >= 0.5 ? 0.6 * jaccard : 0
}

/** Rank connections for a target company, strongest first (strength > 0 only). */
export function rankReferralCandidates(
  connections: readonly LinkedInConnection[],
  targetCompany: string,
): ReferralMatch[] {
  return connections
    .map((connection) => {
      const strength = companyMatchScore(connection.company, targetCompany)
      const reason =
        strength >= 0.85
          ? `Works at ${connection.company || targetCompany}`
          : strength > 0
            ? `Works at ${connection.company} (related to ${targetCompany})`
            : ''
      return { connection, strength, reason }
    })
    .filter((m) => m.strength > 0)
    .sort((a, b) => b.strength - a.strength)
}
