import { detectAuthWallFromSignals } from '@/lib/extension/detect-auth-wall'
import { detectJobUrlKind } from '@/lib/jobs/url-detect'
import type { JobExtractedData } from '@/types'

export type ApplyEase = 'easy' | 'hard' | 'unknown'

export type ApplyEaseResult = {
  ease: ApplyEase
  /** True when hosted Auto-apply is worth offering. */
  hostedAutoApply: boolean
  reason: string
  signals: string[]
}

const EASY_HOSTS = [
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'breezy.hr',
  'workable.com',
  'smartrecruiters.com',
  'recruitee.com',
  'applytojob.com',
  'jazz.co',
  'jobvite.com',
]

const HARD_HOSTS = [
  'linkedin.com',
  'indeed.com',
  'ziprecruiter.com',
  'glassdoor.com',
  'myworkdayjobs.com',
  'workday.com',
  'amazon.jobs',
  'careers.microsoft.com',
  'taleo.net',
  'successfactors.com',
  'icims.com',
  'oraclecloud.com',
  'ultipro.com',
  'adp.com',
  'eightfold.ai',
  'myworkdaysite.com',
]

function hostnameOf(url: string): string {
  try {
    return new URL(url.trim()).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function hostMatches(host: string, needles: string[]): string | null {
  return needles.find(n => host === n || host.endsWith(`.${n}`)) ?? null
}

function countMatches(html: string, re: RegExp): number {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`
  return html.match(new RegExp(re.source, flags))?.length ?? 0
}

function classifyHtml(html: string): ApplyEaseResult {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 12_000)

  const passwordCount = countMatches(html, /<input[^>]*type=["']password["']/i)
  const fileCount = countMatches(html, /<input[^>]*type=["']file["']/i)
  const applyFieldCount =
    countMatches(html, /name=["']first_name["']|id=["']first_name["']|autocomplete=["']given-name["']/i) +
    countMatches(html, /name=["']last_name["']|id=["']last_name["']|autocomplete=["']family-name["']/i) +
    countMatches(html, /name=["']email["']|type=["']email["']|autocomplete=["']email["']/i) +
    countMatches(html, /name=["']resume["']|id=["']resume["']/i)

  const signals: string[] = []
  if (/greenhouse\.io|lever\.co|ashbyhq\.com/i.test(html)) {
    signals.push('embedded-ats')
    return {
      ease: 'easy',
      hostedAutoApply: true,
      reason: 'This page embeds Greenhouse, Lever, or Ashby.',
      signals,
    }
  }

  const wall = detectAuthWallFromSignals({ text, passwordCount, applyFieldCount })
  if (wall.needsAccount) {
    signals.push(`auth-wall:${wall.kind}`)
    return {
      ease: 'hard',
      hostedAutoApply: false,
      reason: wall.reason,
      signals,
    }
  }

  if (fileCount > 0 && applyFieldCount >= 2) {
    signals.push('resume-upload', `fields:${applyFieldCount}`)
    return {
      ease: 'easy',
      hostedAutoApply: true,
      reason: 'This looks like a public apply form (contact fields + resume upload).',
      signals,
    }
  }

  if (applyFieldCount >= 3 && passwordCount === 0) {
    signals.push(`fields:${applyFieldCount}`)
    return {
      ease: 'easy',
      hostedAutoApply: true,
      reason: 'This looks like a public apply form without an account wall.',
      signals,
    }
  }

  signals.push('no-clear-form')
  return {
    ease: 'unknown',
    hostedAutoApply: false,
    reason: 'Could not tell if this is a simple apply form. Apply on the employer site.',
    signals,
  }
}

/**
 * Decide whether hosted Auto-apply is likely to work.
 * Known boards win from the URL. Generic career sites use HTML when we fetched it.
 */
export function classifyApplyEase(input: { url?: string | null; html?: string | null }): ApplyEaseResult {
  const url = (input.url || '').trim()
  const html = input.html?.trim() || ''
  const host = hostnameOf(url)
  const kind = url ? detectJobUrlKind(url) : 'generic'

  if (kind === 'linkedin' || kind === 'aggregator') {
    return {
      ease: 'hard',
      hostedAutoApply: false,
      reason: 'LinkedIn and job aggregators block or complicate auto-apply.',
      signals: [kind],
    }
  }

  if (kind === 'workday' || kind === 'amazon' || kind === 'microsoft') {
    return {
      ease: 'hard',
      hostedAutoApply: false,
      reason: 'This portal usually needs an account or a multi-step login.',
      signals: [kind],
    }
  }

  if (kind === 'greenhouse' || kind === 'lever' || kind === 'ashby') {
    return {
      ease: 'easy',
      hostedAutoApply: true,
      reason: `Public ${kind} apply form — HireIQ can fill it.`,
      signals: [kind],
    }
  }

  const easyHost = hostMatches(host, EASY_HOSTS)
  if (easyHost) {
    return {
      ease: 'easy',
      hostedAutoApply: true,
      reason: `Public ${easyHost} apply form — HireIQ can fill it.`,
      signals: [easyHost],
    }
  }

  const hardHost = hostMatches(host, HARD_HOSTS)
  if (hardHost) {
    return {
      ease: 'hard',
      hostedAutoApply: false,
      reason: 'This site usually needs an account or a complex career portal.',
      signals: [hardHost],
    }
  }

  if (html) return classifyHtml(html)

  return {
    ease: 'unknown',
    hostedAutoApply: false,
    reason: 'Unknown career site — Auto-apply stays hidden until we see a simple public form.',
    signals: ['generic-url'],
  }
}

export function canHostedAutoApply(
  applyUrl?: string | null,
  extracted?: Pick<JobExtractedData, 'apply_ease'> | null,
): boolean {
  if (extracted?.apply_ease === 'easy') return true
  if (extracted?.apply_ease === 'hard') return false
  return classifyApplyEase({ url: applyUrl }).hostedAutoApply
}

export function applyEaseFromExtracted(
  applyUrl?: string | null,
  extracted?: Pick<JobExtractedData, 'apply_ease' | 'apply_ease_reason'> | null,
): ApplyEaseResult {
  if (extracted?.apply_ease === 'easy' || extracted?.apply_ease === 'hard') {
    return {
      ease: extracted.apply_ease,
      hostedAutoApply: extracted.apply_ease === 'easy',
      reason: extracted.apply_ease_reason || '',
      signals: ['stored'],
    }
  }
  return classifyApplyEase({ url: applyUrl })
}
