import { detectAuthWallFromSignals } from '@/lib/extension/detect-auth-wall'
import { extractApplyLinkFromHtml } from '@/lib/apply/extract-apply-link'
import { detectJobUrlKind } from '@/lib/jobs/url-detect'
import type { JobExtractedData } from '@/types'

export type ApplyEase = 'easy' | 'hard' | 'unknown'

export type ApplyEaseResult = {
  ease: ApplyEase
  /** True when hosted Auto-apply is worth offering. */
  hostedAutoApply: boolean
  reason: string
  signals: string[]
  /** When the posting page linked to a different apply URL than the page fetched. */
  detectedApplyUrl?: string
}

export type ApplyEaseUiCopy = {
  title: string
  detail: string
  tone: 'positive' | 'neutral' | 'caution'
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
      reason: 'Scroll, fill in your info, and submit — no account needed.',
      signals,
    }
  }

  const guestApply =
    /apply without (an )?account|continue as guest|guest application|no account required|apply now without registering/i.test(
      text,
    )
  if (guestApply && passwordCount === 0 && applyFieldCount >= 2) {
    signals.push('guest-apply')
    return {
      ease: 'easy',
      hostedAutoApply: true,
      reason: 'Public apply form — scroll, fill in your info, and submit.',
      signals,
    }
  }

  const wall = detectAuthWallFromSignals({ text, passwordCount, applyFieldCount })
  if (wall.needsAccount) {
    signals.push(`auth-wall:${wall.kind}`)
    const reason =
      wall.kind === 'signup'
        ? 'You need to create an employer account before you can apply.'
        : wall.kind === 'login'
          ? 'You need to sign in to the employer site before you can apply.'
          : wall.reason
    return {
      ease: 'hard',
      hostedAutoApply: false,
      reason,
      signals,
    }
  }

  if (fileCount > 0 && applyFieldCount >= 2) {
    signals.push('resume-upload', `fields:${applyFieldCount}`)
    return {
      ease: 'easy',
      hostedAutoApply: true,
      reason: 'Public form with contact fields and resume upload — scroll, fill, submit.',
      signals,
    }
  }

  if (applyFieldCount >= 3 && passwordCount === 0) {
    signals.push(`fields:${applyFieldCount}`)
    return {
      ease: 'easy',
      hostedAutoApply: true,
      reason: 'Looks like a simple apply form — scroll, fill in your info, and submit.',
      signals,
    }
  }

  const multiStepNoAccount =
    /step\s*[12]\s*of|application progress|next step/i.test(text) &&
    passwordCount === 0 &&
    applyFieldCount >= 1
  if (multiStepNoAccount) {
    signals.push('multi-step-form')
    return {
      ease: 'easy',
      hostedAutoApply: true,
      reason: 'Multi-step apply form without an account wall — HireIQ can walk through it.',
      signals,
    }
  }

  signals.push('no-clear-form')
  return {
    ease: 'unknown',
    hostedAutoApply: false,
    reason: 'We could not confirm a simple public apply form from this page.',
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
      reason: `Public ${kind} form — scroll, fill in your info, and submit.`,
      signals: [kind],
    }
  }

  const easyHost = hostMatches(host, EASY_HOSTS)
  if (easyHost) {
    return {
      ease: 'easy',
      hostedAutoApply: true,
      reason: 'Public apply form — scroll, fill in your info, and submit.',
      signals: [easyHost],
    }
  }

  const hardHost = hostMatches(host, HARD_HOSTS)
  if (hardHost) {
    return {
      ease: 'hard',
      hostedAutoApply: false,
      reason: 'This portal usually requires creating an account or signing in first.',
      signals: [hardHost],
    }
  }

  if (html) return classifyHtml(html)

  return {
    ease: 'unknown',
    hostedAutoApply: false,
    reason: 'We have not scanned the apply form yet — open the employer site to check.',
    signals: ['generic-url'],
  }
}

/**
 * Scan a fetched job posting page: find a dedicated Apply link when present,
 * then classify how hard auto-apply would be.
 */
export function classifyApplyEaseFromJobPage(input: {
  pageUrl: string
  pageHtml?: string | null
}): ApplyEaseResult {
  const pageUrl = input.pageUrl.trim()
  const pageHtml = input.pageHtml?.trim() || ''
  if (!pageUrl) return classifyApplyEase({ url: null, html: pageHtml })

  const detectedApplyUrl =
    pageHtml && pageUrl ? extractApplyLinkFromHtml(pageHtml, pageUrl) : null

  if (detectedApplyUrl && detectedApplyUrl !== pageUrl) {
    const fromApplyLink = classifyApplyEase({ url: detectedApplyUrl })
    return {
      ...fromApplyLink,
      detectedApplyUrl,
      signals: [...fromApplyLink.signals, 'apply-link'],
      reason:
        fromApplyLink.ease === 'easy'
          ? 'Apply link points to a public form — scroll, fill, submit.'
          : fromApplyLink.ease === 'hard'
            ? 'Apply link goes to an account portal — sign up or sign in first.'
            : fromApplyLink.reason,
    }
  }

  return classifyApplyEase({ url: pageUrl, html: pageHtml })
}

/** Plain-language copy for job detail / add-job UI. */
export function describeApplyEaseForUi(result: Pick<ApplyEaseResult, 'ease' | 'reason'>): ApplyEaseUiCopy {
  if (result.ease === 'easy') {
    return {
      title: 'Easy to auto-apply',
      detail: result.reason || 'Scroll, fill in your info, and submit — no account needed.',
      tone: 'positive',
    }
  }
  if (result.ease === 'hard') {
    return {
      title: 'Account portal',
      detail: result.reason || 'You will likely need to create an account or sign in before applying.',
      tone: 'caution',
    }
  }
  return {
    title: 'Apply path unknown',
    detail: result.reason || 'We could not scan the apply form from this URL.',
    tone: 'neutral',
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
