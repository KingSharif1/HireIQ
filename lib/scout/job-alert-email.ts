/**
 * Turns Indeed or LinkedIn job-alert emails into leads. Users forward their
 * alert emails to their HireIQ save address; we never log in to those sites.
 *
 * Heuristic: alert layouts change, so this reads links and nearby text rather
 * than relying on exact markup.
 */

export type AlertLead = {
  source: 'indeed' | 'linkedin'
  url: string
  title: string
  company: string | null
  location: string | null
}

const SKIP_TEXT = /\b(unsubscribe|view all|see all|see more|more jobs|settings|manage|preferences|privacy|help|apply now|easily apply)\b/i

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function textOf(html: string): string {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

/** Canonical job URL, or null if this link is not a single job. */
export function canonicalAlertUrl(href: string): { source: AlertLead['source']; url: string } | null {
  let u: URL
  try {
    u = new URL(decode(href))
  } catch {
    return null
  }
  const host = u.hostname.toLowerCase()
  if (host.endsWith('indeed.com')) {
    const jk = u.searchParams.get('jk') || u.searchParams.get('vjk')
    if (jk && /^[a-f0-9]{8,}$/i.test(jk)) {
      return { source: 'indeed', url: `https://www.indeed.com/viewjob?jk=${jk.toLowerCase()}` }
    }
    return null
  }
  if (host.endsWith('linkedin.com')) {
    const m = u.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d{6,})/)
    if (m) return { source: 'linkedin', url: `https://www.linkedin.com/jobs/view/${m[1]}` }
    const id = u.searchParams.get('currentJobId')
    if (id && /^\d{6,}$/.test(id)) return { source: 'linkedin', url: `https://www.linkedin.com/jobs/view/${id}` }
    return null
  }
  return null
}

function splitCompanyLocation(chunk: string): { company: string | null; location: string | null } {
  const clean = chunk.replace(/\s+/g, ' ').trim()
  if (!clean) return { company: null, location: null }
  const parts = clean.split(/\s+[-–·•|]\s+/)
  if (parts.length >= 2) return { company: parts[0] || null, location: parts.slice(1).join(', ') || null }
  return { company: clean, location: null }
}

export function parseJobAlertEmail(html: string): AlertLead[] {
  const leads = new Map<string, AlertLead>()
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

  for (const m of html.matchAll(anchorRe)) {
    const canon = canonicalAlertUrl(m[1])
    if (!canon) continue
    const title = textOf(m[2])
    if (title.length < 4 || title.length > 140 || SKIP_TEXT.test(title)) continue
    if (leads.has(canon.url)) continue

    const after = html.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 700)
    const nextAnchor = after.search(/<a\b/i)
    const window = nextAnchor === -1 ? after : after.slice(0, nextAnchor)
    const chunks = decode(window.replace(/<\/(p|div|td|tr|br|li)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
      .split('\n')
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(s => s.length > 1 && s.length < 120 && !SKIP_TEXT.test(s))

    const { company, location } = splitCompanyLocation(chunks[0] ?? '')
    const loc = location ?? (chunks[1] && !/^\$|per hour|a year|an hour/i.test(chunks[1]) ? chunks[1] : null)

    leads.set(canon.url, { source: canon.source, url: canon.url, title, company, location: loc })
  }
  return [...leads.values()]
}
