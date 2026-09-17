import type { JobExtractedData } from '@/types'
import type { ResumeThemeOverride } from '@/lib/export/theme'

const PROJECT_FIRST_RE =
  /\bhobby\b|\bpassion project|\bpersonal project|\bside project|\bportfolio\b|\btinker|\bprojects count|\bbootcamp\b|\bentry[- ]level\b|\bintern\b/

function jobBlob(job: JobExtractedData): string {
  return [
    job.title,
    job.summary,
    ...(job.responsibilities ?? []),
    ...(job.keywords ?? []),
    ...(job.company_values ?? []),
    ...(job.preferred_skills ?? []),
  ]
    .join(' ')
    .toLowerCase()
}

/** JD that values built work / tinkering over a long employment history. */
export function jobLeadsWithProjects(job: JobExtractedData): boolean {
  return PROJECT_FIRST_RE.test(jobBlob(job))
}

/** Theme override so preview/PDF match the tailored structure. */
export function themeOverrideForJob(job: JobExtractedData): ResumeThemeOverride | null {
  if (!jobLeadsWithProjects(job)) return null
  return {
    sectionOrder: ['summary', 'projects', 'experience', 'skills', 'education'],
  }
}
