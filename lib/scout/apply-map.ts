/**
 * Maps what an employer's apply page looks like so we know whether an agent
 * can fill it in: which system it is, whether it needs a login, shows a
 * captcha, or has a form at all. Pure: takes the page HTML.
 */
import { extractApplyLinkFromHtml } from '@/lib/apply/extract-apply-link'

export type ApplyVendor =
  | 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'icims' | 'smartrecruiters'
  | 'workable' | 'bamboohr' | 'jobvite' | 'taleo' | 'successfactors' | 'recruitee'
  | 'linkedin' | 'indeed' | 'other'

export type ApplyVerdict =
  | 'ready'          // known system, form visible, no wall
  | 'needs-explore'  // unknown system or no form yet: agent should click through
  | 'login-needed'
  | 'captcha'
  | 'aggregator'     // Indeed/LinkedIn/etc: find the employer's own page
  | 'no-form'

export type ApplyMap = {
  vendor: ApplyVendor
  /** Extension and apply worker already know how to fill this system. */
  supported: boolean
  verdict: ApplyVerdict
  fieldCount: number
  hasResumeUpload: boolean
  requiresLogin: boolean
  hasCaptcha: boolean
  /** Likely "Apply" link when this is a description page. */
  applyLink: string | null
  notes: string[]
}

const HOST_VENDORS: Array<[RegExp, ApplyVendor]> = [
  [/(^|\.)greenhouse\.io$/, 'greenhouse'],
  [/(^|\.)lever\.co$/, 'lever'],
  [/(^|\.)ashbyhq\.com$/, 'ashby'],
  [/(^|\.)myworkdayjobs\.com$|(^|\.)workday\.com$/, 'workday'],
  [/(^|\.)icims\.com$/, 'icims'],
  [/(^|\.)smartrecruiters\.com$/, 'smartrecruiters'],
  [/(^|\.)workable\.com$/, 'workable'],
  [/(^|\.)bamboohr\.com$/, 'bamboohr'],
  [/(^|\.)jobvite\.com$/, 'jobvite'],
  [/(^|\.)taleo\.net$/, 'taleo'],
  [/(^|\.)successfactors\.(com|eu)$|(^|\.)sapsf\.com$/, 'successfactors'],
  [/(^|\.)recruitee\.com$/, 'recruitee'],
  [/(^|\.)linkedin\.com$/, 'linkedin'],
  [/(^|\.)indeed\.com$/, 'indeed'],
]

const MARKUP_VENDORS: Array<[RegExp, ApplyVendor]> = [
  [/boards\.greenhouse\.io|job-boards\.greenhouse\.io|grnhse/i, 'greenhouse'],
  [/jobs\.lever\.co|lever-jobs/i, 'lever'],
  [/ashbyhq\.com|data-ashby/i, 'ashby'],
  [/myworkdayjobs\.com|wd\d\.myworkday/i, 'workday'],
  [/icims\.com/i, 'icims'],
  [/smartrecruiters\.com/i, 'smartrecruiters'],
  [/apply\.workable\.com|powered by workable/i, 'workable'],
  [/bamboohr\.com\/careers|bamboohr\.com\/jobs/i, 'bamboohr'],
  [/jobvite\.com/i, 'jobvite'],
  [/taleo\.net/i, 'taleo'],
]

const SUPPORTED: ApplyVendor[] = ['greenhouse', 'lever', 'ashby', 'workday']

function detectVendor(url: string, html: string): ApplyVendor {
  try {
    const host = new URL(url).hostname.toLowerCase()
    for (const [re, v] of HOST_VENDORS) if (re.test(host)) return v
  } catch {
    /* fall through to markup */
  }
  for (const [re, v] of MARKUP_VENDORS) if (re.test(html)) return v
  return 'other'
}

function countFields(html: string): number {
  const inputs = [...html.matchAll(/<input\b[^>]*>/gi)].filter(m => !/type=["']?(hidden|submit|button|image|search)\b/i.test(m[0]))
  const others = (html.match(/<(textarea|select)\b/gi) ?? []).length
  return inputs.length + others
}

export function mapApplyPage(input: { url: string; html: string }): ApplyMap {
  const { url, html } = input
  const vendor = detectVendor(url, html)
  const notes: string[] = []

  const fieldCount = countFields(html)
  const hasResumeUpload = /<input\b[^>]*type=["']?file\b/i.test(html) || /\b(attach|upload)\s+(your\s+)?(resume|cv)\b/i.test(html)
  const hasPassword = /<input\b[^>]*type=["']?password\b/i.test(html)
  const hasCaptcha = /(g-recaptcha|recaptcha\/api|hcaptcha|cf-turnstile|data-sitekey)/i.test(html)
  const signInText = /\b(sign in|log in|create (an )?account|already have an account)\b/i.test(html)
  const requiresLogin = hasPassword && signInText && !hasResumeUpload
  const applyLink = extractApplyLinkFromHtml(html, url)

  if (hasCaptcha) notes.push('captcha present: needs you')
  if (requiresLogin) notes.push('account or sign-in required')
  if (!SUPPORTED.includes(vendor) && vendor !== 'other') notes.push(`${vendor} is not supported by autofill yet`)
  if (vendor === 'other') notes.push('unknown system: agent should click through and learn the form')

  let verdict: ApplyVerdict
  if (vendor === 'indeed' || vendor === 'linkedin') verdict = 'aggregator'
  else if (hasCaptcha) verdict = 'captcha'
  else if (requiresLogin) verdict = 'login-needed'
  else if (fieldCount >= 3 && (hasResumeUpload || fieldCount >= 5)) verdict = SUPPORTED.includes(vendor) ? 'ready' : 'needs-explore'
  else if (applyLink) verdict = 'needs-explore'
  else verdict = 'no-form'

  return {
    vendor,
    supported: SUPPORTED.includes(vendor),
    verdict,
    fieldCount,
    hasResumeUpload,
    requiresLogin,
    hasCaptcha,
    applyLink,
    notes,
  }
}
