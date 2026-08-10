/** Lightweight job-page heuristics for the extension (no Next.js imports). */

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'hireiq.app',
  'www.hireiq.app',
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
}

export function detectJobPage(urlString: string): JobDetectResult {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return { isJobPage: false, reason: 'Invalid URL', kind: 'unknown' }
  }

  const host = url.hostname.toLowerCase()

  if (BLOCKED_HOSTS.some(h => host === h || host.endsWith(`.${h}`))) {
    return {
      isJobPage: false,
      reason: 'HireIQ / local pages can’t be saved as jobs',
      kind: 'blocked',
    }
  }

  if (host.includes('linkedin.com')) {
    const ok = /\/jobs?\//i.test(url.pathname) || url.pathname.includes('/job/view/')
    return ok
      ? { isJobPage: true, reason: 'LinkedIn job', kind: 'linkedin' }
      : { isJobPage: false, reason: 'Open a LinkedIn job posting', kind: 'linkedin' }
  }

  if (JOB_HOST_HINTS.some(h => host === h || host.endsWith(`.${h}`) || host.includes(h))) {
    return { isJobPage: true, reason: 'Known job board', kind: host.includes('indeed') || host.includes('ziprecruiter') || host.includes('glassdoor') ? 'aggregator' : 'ats' }
  }

  if (JOB_PATH_HINTS.some(re => re.test(url.pathname + url.search))) {
    return { isJobPage: true, reason: 'Job-like URL path', kind: 'generic' }
  }

  return {
    isJobPage: false,
    reason: 'Doesn’t look like a job posting — open a careers / jobs page',
    kind: 'unknown',
  }
}
