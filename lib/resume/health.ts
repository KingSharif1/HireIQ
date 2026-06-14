import type { StructuredResume } from '@/types'

export type HealthSeverity = 'good' | 'warn' | 'bad'

export interface HealthCheck {
  id: string
  label: string
  severity: HealthSeverity
  detail?: string
}

interface HealthInput {
  data: StructuredResume
  /** Rendered page count from the preview (so layout checks reflect reality). */
  pageCount?: number
  /** Recommended max pages for the role seniority. */
  recommendedPages?: number
}

/**
 * Deterministic, ATS-style "resume health" checks. This is the cheap half of
 * the polish pass: it inspects the structured content (and the rendered page
 * count) the same way a recruiter/ATS would skim it — no AI required.
 */
export function checkResumeHealth({ data, pageCount, recommendedPages }: HealthInput): HealthCheck[] {
  const checks: HealthCheck[] = []
  const name = data.contact?.name ?? ''

  // Name capitalization
  const properName = /^[A-Z][a-z'’.-]*(\s+[A-Z][a-z'’.-]*)+$/.test(name.trim())
  checks.push({
    id: 'name-case',
    label: 'Name is properly capitalized',
    severity: name ? (properName ? 'good' : 'warn') : 'bad',
    detail: name ? (properName ? undefined : `Shown as "${name}"`) : 'No name found',
  })

  // Contact essentials
  const hasEmail = !!data.contact?.email
  const hasPhone = !!data.contact?.phone
  checks.push({
    id: 'contact',
    label: 'Email and phone present',
    severity: hasEmail && hasPhone ? 'good' : hasEmail || hasPhone ? 'warn' : 'bad',
    detail: hasEmail && hasPhone ? undefined : 'ATS systems key off contact info',
  })

  // Summary
  checks.push({
    id: 'summary',
    label: 'Has a professional summary',
    severity: data.summary && data.summary.trim().length > 30 ? 'good' : 'warn',
  })

  // Page length vs recommendation
  if (pageCount && recommendedPages) {
    const over = pageCount > recommendedPages
    checks.push({
      id: 'length',
      label: `Fits in ${recommendedPages} page${recommendedPages === 1 ? '' : 's'}`,
      severity: over ? 'warn' : 'good',
      detail: over ? `Currently ${pageCount} pages` : undefined,
    })
  }

  // Quantified bullets (metrics)
  const allBullets = [
    ...(data.experience ?? []).flatMap(e => e.bullets ?? []),
    ...(data.projects ?? []).flatMap(p => p.bullets ?? []),
  ]
  const withMetrics = allBullets.filter(b => /\d/.test(b)).length
  const metricRatio = allBullets.length ? withMetrics / allBullets.length : 0
  if (allBullets.length > 0) {
    checks.push({
      id: 'metrics',
      label: 'Bullets include measurable impact',
      severity: metricRatio >= 0.4 ? 'good' : metricRatio >= 0.2 ? 'warn' : 'bad',
      detail: `${withMetrics}/${allBullets.length} bullets have numbers`,
    })
  }

  // Overly long bullets (hard to scan)
  const longBullets = allBullets.filter(b => b.length > 240).length
  if (allBullets.length > 0) {
    checks.push({
      id: 'bullet-length',
      label: 'Bullets are concise',
      severity: longBullets === 0 ? 'good' : 'warn',
      detail: longBullets ? `${longBullets} bullet(s) over ~2 lines` : undefined,
    })
  }

  // Skills present
  const skillCount = [
    ...(data.skills?.technical ?? []),
    ...(data.skills?.tools ?? []),
    ...(data.skills?.languages ?? []),
  ].length
  checks.push({
    id: 'skills',
    label: 'Skills section populated',
    severity: skillCount >= 6 ? 'good' : skillCount > 0 ? 'warn' : 'bad',
    detail: `${skillCount} skills`,
  })

  return checks
}

export function healthScore(checks: HealthCheck[]): number {
  if (checks.length === 0) return 100
  const points = checks.reduce((sum, c) => sum + (c.severity === 'good' ? 1 : c.severity === 'warn' ? 0.5 : 0), 0)
  return Math.round((points / checks.length) * 100)
}
