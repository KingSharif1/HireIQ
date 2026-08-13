import type { ExtractionResult } from '@/lib/jobs/fetch-types'
import { matchHostRule } from '@/lib/jobs/fetch-rules'

type AppleJobsData = {
  postingTitle?: string
  jobSummary?: string
  description?: string
  minimumQualifications?: string
  preferredQualifications?: string
  teamNames?: string[]
  locations?: Array<{ city?: string; stateProvince?: string; countryName?: string }>
}

function joinSections(sections: Array<[string, string | undefined]>): string {
  return sections
    .filter(([, body]) => body?.trim())
    .map(([heading, body]) => `${heading}\n\n${body!.trim()}`)
    .join('\n\n')
}

function formatAppleJob(data: AppleJobsData): ExtractionResult | null {
  const title = data.postingTitle?.trim() || ''
  const location = data.locations?.[0]
  const locationLine = location
    ? [location.city, location.stateProvince, location.countryName].filter(Boolean).join(', ')
    : ''

  const body = joinSections([
    ['Summary', data.jobSummary],
    ['Description', data.description],
    ['Minimum Qualifications', data.minimumQualifications],
    ['Preferred Qualifications', data.preferredQualifications],
  ])

  const header = [title, locationLine].filter(Boolean).join('\n')
  const text = [header, body].filter(Boolean).join('\n\n').trim()
  if (text.length < 80) return null

  return {
    text,
    title: title || 'Untitled role',
    company: 'Apple',
    method: 'hydration-json',
    confidence: 'high',
    ruleId: 'apple-jobs-hydration',
  }
}

function extractAppleHydration(parsed: unknown): ExtractionResult | null {
  if (!parsed || typeof parsed !== 'object') return null
  const root = parsed as Record<string, unknown>
  const loaderData = root.loaderData
  if (!loaderData || typeof loaderData !== 'object') return null
  const jobDetails = (loaderData as Record<string, unknown>).jobDetails
  if (!jobDetails || typeof jobDetails !== 'object') return null
  const jobsData = (jobDetails as Record<string, unknown>).jobsData
  if (!jobsData || typeof jobsData !== 'object') return null
  return formatAppleJob(jobsData as AppleJobsData)
}

/** Known script hydration prefixes → parser. Extend when adding host rules. */
const HYDRATION_PARSERS: Array<{
  prefix: string
  parse: (parsed: unknown, url: string) => ExtractionResult | null
}> = [
  {
    prefix: 'window.__staticRouterHydrationData = JSON.parse(',
    parse: (parsed, url) => {
      if (matchHostRule(url)?.id === 'apple-jobs-hydration') {
        return extractAppleHydration(parsed)
      }
      return extractGenericJobFromObject(parsed)
    },
  },
  {
    prefix: 'window.__NEXT_DATA__ = ',
    parse: parsed => extractGenericJobFromObject(parsed),
  },
  {
    prefix: 'window.__INITIAL_STATE__ = ',
    parse: parsed => extractGenericJobFromObject(parsed),
  },
]

function extractGenericJobFromObject(parsed: unknown): ExtractionResult | null {
  const found = findJobLikeObject(parsed, 0)
  if (!found) return null

  const title =
    pickString(found, ['postingTitle', 'title', 'jobTitle', 'name']) || ''
  const description =
    pickString(found, [
      'description',
      'jobDescription',
      'descriptionPlain',
      'jobSummary',
      'summary',
    ]) || ''
  const company =
    pickString(found, ['company', 'companyName']) ||
    (found.hiringOrganization &&
    typeof found.hiringOrganization === 'object' &&
    !Array.isArray(found.hiringOrganization)
      ? pickString(found.hiringOrganization as Record<string, unknown>, ['name'])
      : '') ||
    ''

  const text = [title, description].filter(Boolean).join('\n\n').trim()
  if (text.length < 80) return null

  return {
    text,
    title: title || 'Untitled role',
    company,
    method: 'hydration-json',
    confidence: description.length >= 200 ? 'high' : 'medium',
  }
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = obj[key]
    if (typeof val === 'string' && val.trim()) return val.trim()
  }
  return ''
}

const JOB_OBJECT_KEYS = new Set([
  'postingTitle',
  'jobTitle',
  'jobDescription',
  'description',
  'descriptionPlain',
  'jobSummary',
  'minimumQualifications',
])

function findJobLikeObject(node: unknown, depth: number): Record<string, unknown> | null {
  if (depth > 8 || !node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findJobLikeObject(item, depth + 1)
      if (hit) return hit
    }
    return null
  }

  const obj = node as Record<string, unknown>
  const keys = Object.keys(obj)
  const score = keys.filter(k => JOB_OBJECT_KEYS.has(k)).length
  if (score >= 2 && typeof obj.description === 'string' && obj.description.length > 80) {
    return obj
  }
  if (score >= 1 && typeof obj.jobDescription === 'string' && obj.jobDescription.length > 80) {
    return obj
  }

  for (const value of Object.values(obj)) {
    const hit = findJobLikeObject(value, depth + 1)
    if (hit) return hit
  }
  return null
}

function parseHydrationScript(content: string, url: string): ExtractionResult | null {
  for (const { prefix, parse } of HYDRATION_PARSERS) {
    const idx = content.indexOf(prefix)
    if (idx < 0) continue

    const start = idx + prefix.length
    let raw: string | null = null

    if (prefix.endsWith('JSON.parse(')) {
      raw = readJsonParseArgument(content, start)
    } else {
      raw = readJsonObjectLiteral(content, start)
    }
    if (!raw) continue

    try {
      const parsed = JSON.parse(raw)
      const hit = parse(parsed, url)
      if (hit) return hit
    } catch {
      continue
    }
  }
  return null
}

/** Read JSON.parse("...") or JSON.parse('...') argument with escape handling. */
function readJsonParseArgument(source: string, start: number): string | null {
  let i = start
  while (i < source.length && /\s/.test(source[i]!)) i++
  const quote = source[i]
  if (quote !== '"' && quote !== "'") return null
  i++

  let out = ''
  while (i < source.length) {
    const ch = source[i]!
    if (ch === '\\') {
      const next = source[i + 1]
      if (next === undefined) return null
      if (next === 'n') out += '\n'
      else if (next === 'r') out += '\r'
      else if (next === 't') out += '\t'
      else if (next === 'u') {
        const hex = source.slice(i + 2, i + 6)
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null
        out += String.fromCharCode(parseInt(hex, 16))
        i += 6
        continue
      } else out += next
      i += 2
      continue
    }
    if (ch === quote) return out
    out += ch
    i++
  }
  return null
}

function readJsonObjectLiteral(source: string, start: number): string | null {
  let i = start
  while (i < source.length && /\s/.test(source[i]!)) i++
  if (source[i] !== '{') return null

  let depth = 0
  let inString: '"' | "'" | null = null
  let escape = false
  const begin = i

  for (; i < source.length; i++) {
    const ch = source[i]!
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === inString) inString = null
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = ch
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return source.slice(begin, i + 1)
    }
  }
  return null
}

/** Extract job content embedded in SPA hydration script tags. */
export function extractFromHydration(html: string, url: string): ExtractionResult | null {
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1] || ''
    if (!content.includes('JSON.parse') && !content.includes('__NEXT_DATA__')) continue
    const hit = parseHydrationScript(content, url)
    if (hit) return hit
  }
  return null
}
