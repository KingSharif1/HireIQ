import type { JobExtractedData } from '@/types'
import { stripAtsChrome } from '@/lib/jobs/description'

const MAX_SUMMARY = 600
const MAX_RESP = 280

function cleanSummary(value: string): string {
  let text = stripAtsChrome(value).replace(/\s+/g, ' ').trim()
  if (!text) return ''
  // Drop leftover title/nav fragments before real prose
  if (/back\s*to\s*jobs|mygreenhouse|afghanistan\s*\+?\s*93/i.test(text)) {
    text = stripAtsChrome(text).replace(/\s+/g, ' ').trim()
  }
  if (text.length > MAX_SUMMARY) {
    text = `${text.slice(0, MAX_SUMMARY - 1).trimEnd()}…`
  }
  return text
}

function cleanResponsibilityLines(values: readonly string[] | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values ?? []) {
    const line = stripAtsChrome(raw).replace(/\s+/g, ' ').trim()
    if (line.length < 20 || line.length > MAX_RESP) continue
    if (/back\s*to\s*jobs|mygreenhouse|first\s*name|afghanistan\s*\+?\s*93/i.test(line)) continue
    if (/[A-Za-z]Apply[A-Z]/.test(line)) continue
    const key = line.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
    if (out.length >= 8) break
  }
  return out
}

/** Ensure job fields exist so ATS scoring never produces NaN; strip ATS form chrome. */
export function normalizeJobExtractedData(
  raw: Partial<JobExtractedData> | null | undefined
): JobExtractedData {
  return {
    title: raw?.title ?? '',
    company: raw?.company ?? '',
    required_skills: raw?.required_skills ?? [],
    preferred_skills: raw?.preferred_skills ?? [],
    required_experience_years: raw?.required_experience_years ?? 0,
    education_requirement: raw?.education_requirement ?? 'none',
    keywords: raw?.keywords ?? [],
    responsibilities: cleanResponsibilityLines(raw?.responsibilities),
    ats_system: raw?.ats_system ?? '',
    red_flags: raw?.red_flags ?? [],
    company_values: raw?.company_values ?? [],
    compensation: raw?.compensation ?? {
      min: null,
      max: null,
      currency: 'USD',
      period: 'year',
    },
    work_type: raw?.work_type ?? '',
    seniority: raw?.seniority ?? '',
    summary: cleanSummary(raw?.summary ?? ''),
    role_thesis: raw?.role_thesis?.trim() || undefined,
    domain_tags: normalizeDomainTags(raw?.domain_tags),
    apply_ease: raw?.apply_ease,
    apply_ease_reason: raw?.apply_ease_reason,
  }
}

function normalizeDomainTags(tags: string[] | undefined): string[] | undefined {
  if (!tags?.length) return undefined
  const cleaned = [
    ...new Set(
      tags
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length >= 2 && t.length <= 32),
    ),
  ].slice(0, 8)
  return cleaned.length ? cleaned : undefined
}
