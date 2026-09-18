import type { JobExtractedData } from '@/types'

export type JobDescriptionView = {
  summary: string
  responsibilities: string[]
  requirements: string[]
  keywords: string[]
  fullText: string
}

const CHROME_LINE =
  /^(back to jobs|create a job alert|quick apply|apply|mygreenhouse|jobs?|careers?|back)$/i

function cleanLine(value: string): string {
  return value
    .replace(/^[\s•*·▪◦‣–—-]+/, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function uniqueLines(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    if (!value) continue
    const line = cleanLine(value)
    const key = line.toLocaleLowerCase()
    if (!line || seen.has(key)) continue
    seen.add(key)
    result.push(line)
  }

  return result
}

function isChromeLine(line: string): boolean {
  return CHROME_LINE.test(line.trim())
}

/**
 * Strip common ATS chrome phrases and un-glue mid-word Apply / location / title chrome.
 * Handles glued forms: Back to jobsRTK, InternshipFarmer, TexasApplyCompany.
 * Also truncates Greenhouse/Lever apply-form chrome (name fields, country dial lists).
 */
export function stripAtsChrome(text: string): string {
  if (!text) return ''

  let result = text

  // Un-glue "TexasApplyAechelon" / "locationApplyCompany" → break before Apply when glued mid-token
  result = result.replace(/([^\s\n])Apply(?=[A-Z])/g, '$1\n\nApply\n\n')

  // "Back to jobs" glued to title (Back to jobsRTK…) — remove chrome, keep following text
  result = result.replace(/Back\s*to\s*jobs(?=[A-Za-z])/gi, '\n\n')
  result = result.replace(/Back\s*to\s*jobs/gi, '\n\n')
  result = result.replace(/Create\s+a\s+Job\s+Alert/gi, '\n\n')
  result = result.replace(/Quick\s+Apply/gi, '\n\n')

  // Title glued to city: InternshipFarmer's Branch → Internship + Farmer's Branch
  result = result.replace(
    /([a-z])([A-Z][a-z]+(?:'s)?\s+(?:Branch|City|Park|Hills|Valley|Springs|Beach|Creek|Heights|Grove|Vista))/g,
    '$1\n\n$2'
  )
  // Word glued directly onto a state / work-type token: …BranchTexas / …RoleRemote
  result = result.replace(/([a-z])((?:Texas|California|Remote|Hybrid)\b)/g, '$1\n\n$2')

  // Standalone Apply (own line / leftover after un-glue)
  result = result.replace(/(^|\n)\s*Apply\s*(?=\n|$)/gi, '$1')

  result = truncateAtApplyForm(result)

  // Collapse runs of blank lines created by removals
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trim()
}

/**
 * Cut at Greenhouse/Lever application widgets that get scraped into the JD:
 * MyGreenhouse, First/Last Name fields, country dial catalogs, "N results found".
 */
function truncateAtApplyForm(text: string): string {
  if (!text) return ''

  const markers: RegExp[] = [
    /\bwith\s*MyGreenhouse/i,
    /MyGreenhouse/i,
    /\bFirst\s*Name\*?\s*Last\s*Name/i,
    /\bPreferred\s*First\s*Name/i,
    /\bEmail\*?\s*Phone\b/i,
    /\b\d+\s+results?\s+found\b/i,
    /\bNo\s+results?\s+found\b/i,
    // Country dial catalog start (Afghanistan+93…)
    /\bAfghanistan\s*\+?\s*93\b/i,
  ]

  let cutAt = -1
  for (const marker of markers) {
    const match = marker.exec(text)
    if (match?.index != null && (cutAt < 0 || match.index < cutAt)) {
      cutAt = match.index
    }
  }

  let result = cutAt >= 0 ? text.slice(0, cutAt) : text

  // Safety: strip dense dial-code runs that survived (CountryName+digits glued)
  result = result.replace(
    /(?:[A-ZÀ-ÖØ-Þ][A-Za-zÀ-öø-ÿ'.\s-]{1,40}\+?\d{1,4}){8,}/g,
    '\n\n'
  )

  return result.trim()
}

/** Preserve paragraphs; apply ATS chrome stripping. */
export function normalizeJobDescription(value: string | null | undefined): string {
  if (!value) return ''

  const stripped = stripAtsChrome(value.replace(/\r\n?/g, '\n'))

  const paragraphs = stripped
    .split(/\n\s*\n/)
    .map(para =>
      para
        .split('\n')
        .map(cleanLine)
        .filter(Boolean)
        .join('\n')
    )
    .filter(Boolean)

  return paragraphs.join('\n\n')
}

function compactSummary(value: string): string {
  const summary = cleanLine(value)
  if (summary.length <= 360) return summary
  return `${summary.slice(0, 357).trimEnd()}…`
}

/** True when a line still looks like ATS nav / glued location chrome. */
export const MAX_RESPONSIBILITY_CHARS = 280

function looksLikeAtsChromeSummary(value: string): boolean {
  if (!value) return false
  if (/back\s*to\s*jobs/i.test(value)) return true
  if (/[A-Za-z]Apply[A-Z]/.test(value)) return true
  if (/create\s+a\s+job\s+alert/i.test(value)) return true
  // Title glued to city without space: "...InternshipFarmer's Branch"
  if (/[a-z][A-Z][a-z]+(?:'s)?\s+Branch|[a-z](?:Texas|California|Remote|Hybrid)\b/.test(value)) {
    return true
  }
  return false
}

/** Title/location leftovers after chrome un-glue (not real responsibilities). */
function looksLikeTitleOrLocationFragment(line: string): boolean {
  // "Farmer's Branch, Texas" / "Austin, TX"
  if (/^[A-Za-z'.\s-]+,\s*(?:[A-Z]{2}|Texas|California|New York|Florida|Remote)\.?$/i.test(line)) {
    return true
  }
  // "RTK - Junior Software Engineer - Internship" (board title chrome, no verb)
  const hasRoleWord =
    /\b(Junior|Senior|Staff|Intern|Internship|Engineer|Developer|Manager|Analyst|Designer)\b/i.test(
      line
    )
  const hasVerb =
    /\b(is|are|we|our|build|builds|develop|design|create|lead|manage|work|partner|collaborate|seek|looking)\b/i.test(
      line
    )
  if (hasRoleWord && !hasVerb) return true
  if (/^[A-Z]{2,5}\s*[-–—]/.test(line) && !hasVerb) return true
  return false
}

/** Reject chrome blobs and wall-of-text lines as responsibility bullets. */
function isUsableResponsibility(
  line: string,
  options: { minLength?: number } = {}
): boolean {
  const minLength = options.minLength ?? 3
  if (!line) return false
  if (line.length < minLength || line.length > MAX_RESPONSIBILITY_CHARS) return false
  if (isChromeLine(line)) return false
  if (looksLikeAtsChromeSummary(line)) return false
  if (looksLikeTitleOrLocationFragment(line)) return false
  if (/[A-Za-z]Apply[A-Z]/.test(line)) return false
  if (/back\s*to\s*jobs/i.test(line)) return false
  return true
}

function fallbackSummary(fullText: string): string {
  if (!fullText) return ''

  const paragraphs = fullText
    .split(/\n\s*\n/)
    .map(para => cleanLine(para.replace(/\n/g, ' ')))
    .filter(Boolean)

  const prose =
    paragraphs.find(
      para =>
        para.length > 80 &&
        /\b(is|are|we|our|seeking|looking|producer|company|team)\b/i.test(para) &&
        !looksLikeAtsChromeSummary(para)
    ) ||
    paragraphs.find(para => para.length > 60 && !looksLikeAtsChromeSummary(para)) ||
    paragraphs.find(para => !looksLikeAtsChromeSummary(para)) ||
    paragraphs[0] ||
    ''

  if (prose.length <= 360) return prose
  return `${prose.slice(0, 357).trimEnd()}…`
}

function deriveResponsibilities(fullText: string, summary: string): string[] {
  if (!fullText) return []

  const candidates = fullText
    .split(/\n+/)
    .flatMap(line => line.split(/(?<=[.!?])\s+(?=[A-Z])/))
    .map(cleanLine)
    .filter(Boolean)

  const summaryKey = summary.toLocaleLowerCase().slice(0, 40)
  const seen = new Set<string>()
  const result: string[] = []

  for (const line of candidates) {
    // Derived lines need more substance than short extracted bullets
    if (!isUsableResponsibility(line, { minLength: 20 })) continue
    const key = line.toLocaleLowerCase()
    if (seen.has(key)) continue
    if (summaryKey && key.startsWith(summaryKey)) continue
    seen.add(key)
    result.push(line)
    if (result.length >= 8) break
  }

  // Prefer empty over a single ATS chrome blob; Full posting accordion carries text.
  return result
}

export function buildJobDescriptionView(
  description: string | null | undefined,
  extracted: JobExtractedData | null | undefined
): JobDescriptionView {
  const fullText = normalizeJobDescription(description)
  const requiredSkills = uniqueLines(extracted?.required_skills ?? [])
  const preferredSkills = uniqueLines(extracted?.preferred_skills ?? [])
  const extractedResponsibilities = uniqueLines(extracted?.responsibilities ?? [])
    .filter(line => isUsableResponsibility(line))
    .slice(0, 8)
  const extractedKeywords = uniqueLines(extracted?.keywords ?? []).slice(0, 16)

  const requirements = uniqueLines([
    extracted?.required_experience_years
      ? `${extracted.required_experience_years}+ years of relevant experience`
      : null,
    extracted?.education_requirement,
    ...requiredSkills.map(skill => `Required: ${skill}`),
    ...preferredSkills.map(skill => `Preferred: ${skill}`),
  ]).slice(0, 10)

  const extractedEmpty =
    extractedResponsibilities.length === 0 &&
    requirements.length === 0 &&
    extractedKeywords.length === 0

  const extractedSummary = compactSummary(stripAtsChrome(extracted?.summary ?? ''))
  let summary =
    (extractedSummary && !looksLikeAtsChromeSummary(extractedSummary)
      ? extractedSummary
      : '') || fallbackSummary(fullText)
  let responsibilities = extractedResponsibilities
  let finalRequirements = requirements
  let keywords = extractedKeywords

  if (extractedEmpty && fullText) {
    summary = fallbackSummary(fullText)
    responsibilities = deriveResponsibilities(fullText, summary)
    finalRequirements = []
    keywords = []
  } else if (responsibilities.length === 0 && fullText) {
    responsibilities = deriveResponsibilities(fullText, summary)
  }

  if (looksLikeAtsChromeSummary(summary) && fullText) {
    summary = fallbackSummary(fullText)
  }

  return {
    summary,
    responsibilities,
    requirements: finalRequirements,
    keywords,
    fullText,
  }
}
