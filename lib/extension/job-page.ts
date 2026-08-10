/** Server-side job URL gate (mirrors extension/src/detect.ts). */

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', 'hireiq.app', 'www.hireiq.app']

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

export function assertSavableJobUrl(urlString: string): string | null {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return 'Invalid url'
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'url must be http(s)'
  }

  const host = url.hostname.toLowerCase()
  if (BLOCKED_HOSTS.some(h => host === h || host.endsWith(`.${h}`))) {
    return 'Cannot save HireIQ or local pages as jobs'
  }

  if (host.includes('linkedin.com')) {
    const ok = /\/jobs?\//i.test(url.pathname) || url.pathname.includes('/job/view/')
    return ok ? null : 'Open a LinkedIn job posting URL'
  }

  if (JOB_HOST_HINTS.some(h => host === h || host.endsWith(`.${h}`) || host.includes(h))) {
    return null
  }

  if (JOB_PATH_HINTS.some(re => re.test(url.pathname + url.search))) {
    return null
  }

  return 'URL doesn’t look like a job posting'
}
