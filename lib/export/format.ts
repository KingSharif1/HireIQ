import type { ResumeEducation, ResumeSkills, StructuredResume } from '@/types'
import { uniqueSkillLabels } from '@/lib/profile/skills'

const SEPARATOR_ONLY = /^[\s\-–—·.|]+$/

/** Drop a leading or trailing dash, bullet, or pipe left by a sparse model line. */
export function stripEdgeSeparators(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/^[\s\-–—·|]+/, '')
    .replace(/[\s\-–—·|]+$/, '')
    .trim()
}

/** A date token, or empty when the model stored only a separator. */
export function cleanDateToken(value: string | null | undefined): string {
  const text = stripEdgeSeparators(value)
  if (!text || SEPARATOR_ONLY.test(text)) return ''
  return text
}

/** Avoid "B.S. in Computer Science in Computer Science" when degree already includes the field. */
export function formatDegreeField(degree: string, field: string): string {
  const d = stripEdgeSeparators(degree)
  const f = stripEdgeSeparators(field)
  if (!d && !f) return ''
  if (!f || SEPARATOR_ONLY.test(f)) return d
  if (!d || SEPARATOR_ONLY.test(d)) return f
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

/** Join a date range without a dangling separator when one side is empty or only a dash. */
export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string {
  return [cleanDateToken(startDate), cleanDateToken(endDate)].filter(Boolean).join(' – ')
}

/**
 * Strip inline markdown markers for plain-text renderers (preview, PDF, DOCX).
 * Profile bullets sometimes carry `**bold**` markers that would otherwise show literally.
 */
export function stripMarkdownInline(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/__([\s\S]+?)__/g, '$1')
    .replace(/`([\s\S]+?)`/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
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

function cleanLine(value: string | null | undefined): string {
  return stripMarkdownInline(value).replace(/[ \t]+\n/g, '\n').trim()
}

/** Deterministic polish before PDF/preview — never invents content. */
export function polishStructuredForExport(data: StructuredResume): StructuredResume {
  return {
    ...data,
    summary: cleanLine(data.summary),
    skills: dedupeResumeSkills({
      technical: (data.skills?.technical ?? []).map(s => cleanLine(s)).filter(Boolean),
      soft: (data.skills?.soft ?? []).map(s => cleanLine(s)).filter(Boolean),
      tools: (data.skills?.tools ?? []).map(s => cleanLine(s)).filter(Boolean),
      languages: (data.skills?.languages ?? []).map(s => cleanLine(s)).filter(Boolean),
    }),
    experience: (data.experience ?? []).map(exp => ({
      ...exp,
      bullets: (exp.bullets ?? []).map(b => cleanLine(b)).filter(Boolean),
      startDate: cleanDateToken(exp.startDate),
      endDate: cleanDateToken(exp.endDate),
    })),
    projects: (data.projects ?? []).map(proj => ({
      ...proj,
      description: cleanLine(proj.description),
      bullets: (proj.bullets ?? []).map(b => cleanLine(b)).filter(Boolean),
    })),
    education: (data.education ?? []).map(edu => {
      const degree = stripEdgeSeparators(cleanLine(edu.degree))
      const field = stripEdgeSeparators(cleanLine(edu.field))
      const institution = stripEdgeSeparators(cleanLine(edu.institution))
      const line = formatDegreeField(degree, field)
      const fieldRedundant =
        Boolean(field) &&
        (degree.toLowerCase().includes(field.toLowerCase()) || /\bin\b/i.test(degree))
      return {
        ...edu,
        degree: line || degree,
        field: fieldRedundant ? '' : field,
        institution,
        startDate: cleanDateToken(edu.startDate),
        endDate: cleanDateToken(edu.endDate),
      }
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
