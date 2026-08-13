/** Lightweight job-page heuristics for the extension (no Next.js imports). */

import { applyFormSelectorList, postingSelectorList } from '@hireiq/board'

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'hireiq.app',
  'www.hireiq.app',
  'hireiq.kingsharif.com',
]

const JOB_HOST_HINTS = [
  'linkedin.com',
  'indeed.com',
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'myworkdayjobs.com',
  'workday.com',
  'ziprecruiter.com',
  'glassdoor.com',
  'boards.greenhouse.io',
  'jobs.lever.co',
  'wellfound.com',
  'angel.co',
  'amazon.jobs',
  'careers.microsoft.com',
]

const JOB_PATH_HINTS = [
  /\/jobs?\//i,
  /\/job\//i,
  /\/careers?\//i,
  /\/positions?\//i,
  /\/openings?\//i,
  /\/apply/i,
  /job_board/i,
  /gh_jid=/i,
]

export type JobDetectResult = {
  isJobPage: boolean
  reason: string
  kind: 'ats' | 'aggregator' | 'linkedin' | 'generic' | 'blocked' | 'unknown'
  /** posting = JD view; apply = application form present */
  pageKind: 'posting' | 'apply' | 'unknown'
}

export function detectPageKind(doc: Document = document, hostname?: string): 'posting' | 'apply' | 'unknown' {
  const host =
    hostname ||
    (typeof location !== 'undefined' ? location.hostname : '')
  const hasApplyForm = Boolean(doc.querySelector(applyFormSelectorList(host)))
  const hasLongJd = (doc.querySelector(postingSelectorList(host))?.textContent || '').length > 400
  if (hasApplyForm) return 'apply'
  if (hasLongJd) return 'posting'
  return 'unknown'
}

export function detectJobPage(urlString: string, doc?: Document): JobDetectResult {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return { isJobPage: false, reason: 'Invalid URL', kind: 'unknown', pageKind: 'unknown' }
  }

  const host = url.hostname.toLowerCase()
  const pageKind = doc ? detectPageKind(doc, host) : 'unknown'

  if (BLOCKED_HOSTS.some(h => host === h || host.endsWith(`.${h}`))) {
    return {
      isJobPage: false,
      reason: 'HireIQ / local pages can’t be saved as jobs',
      kind: 'blocked',
      pageKind,
    }
  }

  if (host.includes('linkedin.com')) {
    const ok = /\/jobs?\//i.test(url.pathname) || url.pathname.includes('/job/view/')
    return ok
      ? { isJobPage: true, reason: 'LinkedIn job', kind: 'linkedin', pageKind }
      : { isJobPage: false, reason: 'Open a LinkedIn job posting', kind: 'linkedin', pageKind }
  }

  if (JOB_HOST_HINTS.some(h => host === h || host.endsWith(`.${h}`) || host.includes(h))) {
    return {
      isJobPage: true,
      reason: 'Known job board',
      kind:
        host.includes('indeed') || host.includes('ziprecruiter') || host.includes('glassdoor')
          ? 'aggregator'
          : 'ats',
      pageKind,
    }
  }

  if (JOB_PATH_HINTS.some(re => re.test(url.pathname + url.search))) {
    return { isJobPage: true, reason: 'Job-like URL path', kind: 'generic', pageKind }
  }

  return {
    isJobPage: false,
    reason: 'Doesn’t look like a job posting — open a careers / jobs page',
    kind: 'unknown',
    pageKind,
  }
}
