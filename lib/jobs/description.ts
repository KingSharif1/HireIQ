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
 * Strip common ATS chrome phrases and un-glue mid-word Apply (e.g. TexasApplyCompany).
 */
export function stripAtsChrome(text: string): string {
  if (!text) return ''

  let result = text

  // Un-glue "TexasApplyAechelon" → break before Apply when glued mid-token
  result = result.replace(/([^\s\n])Apply(?=[A-Z])/g, '$1\n\nApply\n\n')

  result = result.replace(/Back\s*to\s*jobs/gi, '\n\n')
  result = result.replace(/Create\s+a\s+Job\s+Alert/gi, '\n\n')
  result = result.replace(/Quick\s+Apply/gi, '\n\n')
  result = result.replace(/\bMyGreenhouse\b/gi, '\n\n')

  // Standalone Apply (own line / leftover after un-glue)
  result = result.replace(/(^|\n)\s*Apply\s*(?=\n|$)/gi, '$1')

  // Collapse runs of blank lines created by removals
  result = result.replace(/\n{3,}/g, '\n\n')

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
    if (line.length < 20) continue
    if (isChromeLine(line)) continue
    const key = line.toLocaleLowerCase()
    if (seen.has(key)) continue
    if (summaryKey && key.startsWith(summaryKey)) continue
    seen.add(key)
    result.push(line)
    if (result.length >= 8) break
  }

  return result
}

export function buildJobDescriptionView(
  description: string | null | undefined,
  extracted: JobExtractedData | null | undefined
): JobDescriptionView {
  const fullText = normalizeJobDescription(description)
  const requiredSkills = uniqueLines(extracted?.required_skills ?? [])
  const preferredSkills = uniqueLines(extracted?.preferred_skills ?? [])
  const extractedResponsibilities = uniqueLines(extracted?.responsibilities ?? []).slice(0, 8)
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
