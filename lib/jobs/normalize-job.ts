import type { JobExtractedData } from '@/types'

/** Ensure job fields exist so ATS scoring never produces NaN. */
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
    responsibilities: raw?.responsibilities ?? [],
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
    summary: raw?.summary ?? '',
  }
}
