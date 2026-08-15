import type { ResumeEducation, ResumeSkills, StructuredResume } from '@/types'
import { uniqueSkillLabels } from '@/lib/profile/skills'

/** Avoid "B.S. in Computer Science in Computer Science" when degree already includes the field. */
export function formatDegreeField(degree: string, field: string): string {
  const d = (degree ?? '').trim()
  const f = (field ?? '').trim()
  if (!d && !f) return ''
  if (!f) return d
  if (!d) return f
  const dLower = d.toLowerCase()
  const fLower = f.toLowerCase()
  if (dLower.includes(fLower)) return d
  if (fLower.includes(dLower) && fLower.length > dLower.length) return f
  // Degree already says "in …"
  if (/\bin\b/i.test(d)) return d
  return `${d} in ${f}`
}

export function formatEducationLine(edu: Pick<ResumeEducation, 'degree' | 'field'>): string {
  return formatDegreeField(edu.degree ?? '', edu.field ?? '')
}

/** Deduplicate across technical / tools / languages (case-insensitive). Soft stays separate.
 * Order matters: languages first so TS/JS stay under Languages, not stolen by Frameworks. */
export function dedupeResumeSkills(skills: ResumeSkills): ResumeSkills {
  const seen = new Set<string>()
  const take = (arr: string[]) => {
    const out: string[] = []
    for (const raw of uniqueSkillLabels(arr)) {
      const key = raw.toLocaleLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(raw)
    }
    return out
  }
  const languages = take(skills.languages ?? [])
  const technical = take(skills.technical ?? [])
  const tools = take(skills.tools ?? [])
  return {
    languages,
    technical,
    tools,
    soft: uniqueSkillLabels(skills.soft ?? []),
  }
}

export type SkillCategoryLine = { label: string; items: string[] }

/** Claude-style categorized skills for ATS + recruiter skim. */
export function skillCategoryLines(skills: ResumeSkills): SkillCategoryLine[] {
  const clean = dedupeResumeSkills(skills)
  const lines: SkillCategoryLine[] = []
  if (clean.languages.length) lines.push({ label: 'Languages', items: clean.languages })
  if (clean.technical.length) lines.push({ label: 'Frameworks & Tools', items: clean.technical })
  if (clean.tools.length) {
    // Prefer Cloud & Data label when tools look infra-ish; else Tools.
    const cloudish = clean.tools.some(t =>
      /aws|azure|gcp|docker|kubern|supabase|postgres|mysql|vercel|stripe|ci\/?cd/i.test(t)
    )
    lines.push({
      label: cloudish ? 'Cloud & Data' : 'Tools',
      items: clean.tools,
    })
  }
  if (clean.soft.length) lines.push({ label: 'Soft Skills', items: clean.soft })
  // If everything landed in technical only, still show one line.
  if (lines.length === 0 && clean.technical.length) {
    lines.push({ label: 'Skills', items: clean.technical })
  }
  return lines
}

/** Flatten for ATS keyword density while keeping order: languages → technical → tools. */
export function flattenSkillsForAts(skills: ResumeSkills): string[] {
  const clean = dedupeResumeSkills(skills)
  return uniqueSkillLabels([
    ...clean.languages,
    ...clean.technical,
    ...clean.tools,
  ])
}

/** Deterministic polish before PDF/preview — never invents content. */
export function polishStructuredForExport(data: StructuredResume): StructuredResume {
  return {
    ...data,
    skills: dedupeResumeSkills(data.skills ?? {
      technical: [],
      soft: [],
      tools: [],
      languages: [],
    }),
    education: (data.education ?? []).map(edu => {
      const line = formatEducationLine(edu)
      // If degree already contained the field, clear field so renderers don't double-append.
      const field = (edu.field ?? '').trim()
      const degree = (edu.degree ?? '').trim()
      if (field && degree.toLowerCase().includes(field.toLowerCase())) {
        return { ...edu, degree: line || degree, field: '' }
      }
      if (/\bin\b/i.test(degree) && field) {
        return { ...edu, field: '' }
      }
      return edu
    }),
  }
}

/** Drop whole sections for master export (section checkboxes). */
export function filterResumeBySections(
  data: StructuredResume,
  sectionIds: string[] | null | undefined
): StructuredResume {
  if (!sectionIds) return data
  const keep = new Set(sectionIds)
  return {
    ...data,
    summary: keep.has('summary') ? data.summary : '',
    experience: keep.has('experience') ? data.experience : [],
    skills: keep.has('skills')
      ? data.skills
      : { technical: [], soft: [], tools: [], languages: [] },
    education: keep.has('education') ? data.education : [],
    projects: keep.has('projects') ? data.projects : [],
    certifications: keep.has('certifications') ? data.certifications : [],
  }
}
