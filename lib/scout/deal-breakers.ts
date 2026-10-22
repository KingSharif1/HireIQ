/**
 * Hard rules that rule a job out whatever its fit score. Pure.
 */

export type ScoutPrefs = {
  /** Accept fully remote roles. */
  remoteOk: boolean
  /** Accept on-site or hybrid only when location text matches one of these (state names, abbreviations, cities). */
  locationTerms: string[]
  /** Title or description terms that rule a job out (e.g. "security clearance"). */
  excludeTerms: string[]
  /** Title terms for levels to skip. */
  excludeLevels: string[]
}

export const DEFAULT_SCOUT_PREFS: ScoutPrefs = {
  remoteOk: true,
  locationTerms: [
    'texas', ', tx', ' tx', 'abilene', 'dallas', 'fort worth', 'dfw', 'plano', 'irving', 'frisco',
    'austin', 'houston', 'san antonio', 'lubbock', 'midland', 'odessa', 'round rock', 'the woodlands',
  ],
  excludeTerms: ['security clearance', 'ts/sci', 'us citizenship required', 'u.s. citizenship required'],
  excludeLevels: ['senior', 'sr.', 'staff', 'principal', 'lead', 'director', 'manager', 'vp ', 'head of', 'architect'],
}

export type DealBreakerResult = { blocked: boolean; reasons: string[] }

export function evaluateDealBreakers(
  job: { title: string; location?: string | null; remote?: boolean | null; description?: string | null },
  prefs: ScoutPrefs = DEFAULT_SCOUT_PREFS,
): DealBreakerResult {
  const reasons: string[] = []
  const title = ` ${job.title.toLowerCase()} `
  const loc = ` ${(job.location ?? '').toLowerCase()} `
  const desc = (job.description ?? '').toLowerCase()

  const lvl = prefs.excludeLevels.find(t => {
    const word = t.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|\\W)${word}(?=\\W|$)`, 'i').test(title)
  })
  if (lvl) reasons.push(`level: "${lvl.trim()}"`)

  const term = prefs.excludeTerms.find(t => desc.includes(t.toLowerCase()) || title.includes(t.toLowerCase()))
  if (term) reasons.push(`requires: ${term}`)

  const isRemote = job.remote === true || /\bremote\b/.test(loc) || /\bremote\b/.test(title)
  if (!isRemote) {
    // A missing location is unknown, not a reason to rule the job out.
    const hasLocation = (job.location ?? '').trim().length > 0
    const inArea = prefs.locationTerms.some(t => loc.includes(t.toLowerCase()))
    if (hasLocation && !inArea) reasons.push(`location outside target (${(job.location ?? '').trim()})`)
  } else if (!prefs.remoteOk) {
    reasons.push('remote roles not accepted')
  }

  return { blocked: reasons.length > 0, reasons }
}
