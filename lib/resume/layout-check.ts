import type { StructuredResume } from '@/types'
import { countEmDashes, findAiTells } from '@/lib/resume/ai-tells'

export type LayoutCheckSeverity = 'critical' | 'warning' | 'info'

export type LayoutCheckIssue = {
  id: string
  severity: LayoutCheckSeverity
  title: string
  detail: string
}

export type LayoutCheckResult = {
  ok: boolean
  issues: LayoutCheckIssue[]
}

const PLACEHOLDER_PATTERNS = [
  /\b(lorem ipsum|xxx+|tbd|todo|placeholder|\[your name\]|\[company\])\b/i,
  /\{\{[^}]+\}\}/,
]

function hasPlaceholder(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(trimmed))
}

/** Classify a date string so mixed formats can be flagged for ATS consistency. */
function dateFormatClass(date: string): 'month-year' | 'year' | 'numeric' | 'other' | null {
  const d = date.trim()
  if (!d) return null
  if (/^(present|current|now)$/i.test(d)) return null
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}$/i.test(d)) return 'month-year'
  if (/^\d{4}$/.test(d)) return 'year'
  if (/^(\d{1,2}\/\d{4}|\d{4}-\d{1,2})$/.test(d)) return 'numeric'
  return 'other'
}

function checkDateConsistency(
  resume: StructuredResume,
  issues: LayoutCheckIssue[]
): void {
  const classes = new Set<string>()
  const samples: string[] = []
  const collect = (d?: string) => {
    const c = d ? dateFormatClass(d) : null
    if (c) {
      classes.add(c)
      if (samples.length < 4) samples.push(d!.trim())
    }
  }
  for (const role of resume.experience ?? []) {
    collect(role.startDate)
    collect(role.endDate)
  }
  for (const edu of resume.education ?? []) {
    collect(edu.startDate)
    collect(edu.endDate)
  }
  if (classes.size > 1) {
    issues.push({
      id: 'inconsistent-dates',
      severity: 'warning',
      title: 'Mixed date formats',
      detail: `Dates use ${classes.size} different formats (e.g. ${samples.join(', ')}). ATS parsers prefer one consistent format like "Jan 2024".`,
    })
  }
}

/** Warn when generated-sounding diction slipped into the resume text. */
function checkAiTells(resume: StructuredResume, issues: LayoutCheckIssue[]): void {
  const texts: string[] = [resume.summary ?? '']
  for (const role of resume.experience ?? []) texts.push(...(role.bullets ?? []))
  for (const project of resume.projects ?? []) {
    texts.push(project.description ?? '', ...(project.bullets ?? []))
  }
  const combined = texts.join('\n')
  const tells = new Set<string>()
  for (const text of texts) {
    for (const t of findAiTells(text)) tells.add(t)
  }
  const emDashes = countEmDashes(combined)
  if (tells.size > 0 || emDashes > 2) {
    const parts: string[] = []
    if (tells.size > 0) parts.push(`"${[...tells].slice(0, 4).join('", "')}"${tells.size > 4 ? '…' : ''}`)
    if (emDashes > 2) parts.push(`${emDashes} em-dashes`)
    issues.push({
      id: 'ai-tell-diction',
      severity: 'warning',
      title: 'Possibly AI-sounding diction',
      detail: `Found ${parts.join(' and ')} — these read as generated to recruiters. Consider rewording in your own voice.`,
    })
  }
}
export function runResumeLayoutCheck(
  resume: StructuredResume,
  options?: {
    pageCount?: number
    fonts?: { bodyFontSize?: number; nameFontSize?: number; lineHeight?: number }
    /** When 'columns', warn — some ATS parsers read multi-column skills out of order. */
    skillsLayout?: string
  },
): LayoutCheckResult {
  const issues: LayoutCheckIssue[] = []

  const name = resume.contact?.name?.trim() ?? ''
  if (!name) {
    issues.push({
      id: 'missing-name',
      severity: 'critical',
      title: 'Missing name',
      detail: 'Add your name in contact before exporting.',
    })
  } else if (hasPlaceholder(name)) {
    issues.push({
      id: 'placeholder-name',
      severity: 'critical',
      title: 'Placeholder in name',
      detail: 'Replace placeholder contact text with your real details.',
    })
  }

  const summary = resume.summary?.trim() ?? ''
  if (summary && summary.length > 900) {
    issues.push({
      id: 'long-summary',
      severity: 'warning',
      title: 'Summary is long',
      detail: 'Consider tightening the summary to ~4–6 lines for one-page resumes.',
    })
  }

  const experienceCount = resume.experience?.length ?? 0
  const projectCount = resume.projects?.length ?? 0
  if (experienceCount === 0 && projectCount === 0) {
    issues.push({
      id: 'no-experience',
      severity: 'critical',
      title: 'No experience or projects',
      detail: 'Add at least one role or project before exporting.',
    })
  }

  let bulletCount = 0
  for (const role of resume.experience ?? []) {
    for (const bullet of role.bullets ?? []) {
      bulletCount += 1
      if (hasPlaceholder(bullet)) {
        issues.push({
          id: `placeholder-exp-${role.id}-${bulletCount}`,
          severity: 'warning',
          title: 'Placeholder in experience',
          detail: `Review bullets for ${role.company || role.title || 'a role'}.`,
        })
        break
      }
    }
    if (bulletCount > 28) break
  }
  if (bulletCount > 28) {
    issues.push({
      id: 'many-bullets',
      severity: 'warning',
      title: 'Heavy bullet count',
      detail: `${bulletCount} bullets may overflow a one-page layout — trim lower-priority items.`,
    })
  }

  if (options?.pageCount && options.pageCount > 1) {
    issues.push({
      id: 'multi-page',
      severity: 'warning',
      title: 'Runs past one page',
      detail: `Preview is ${options.pageCount} pages. Trim content if you need a one-page resume.`,
    })
  }

  const bodySize = options?.fonts?.bodyFontSize
  const nameSize = options?.fonts?.nameFontSize
  const lineHeight = options?.fonts?.lineHeight
  if (bodySize != null && (bodySize > 12 || bodySize < 9)) {
    issues.push({
      id: 'body-font-size',
      severity: 'warning',
      title: 'Body font size is off',
      detail:
        bodySize > 12
          ? `Body text is ${bodySize}pt — 10–11pt usually fits a one-page resume.`
          : `Body text is ${bodySize}pt — below 9pt can fail ATS parsing and print poorly.`,
    })
  }
  if (nameSize != null && nameSize > 28) {
    issues.push({
      id: 'name-font-size',
      severity: 'warning',
      title: 'Name is very large',
      detail: `Name is ${nameSize}pt and can push the resume onto a second page.`,
    })
  }
  if (lineHeight != null && lineHeight > 1.65) {
    issues.push({
      id: 'line-height',
      severity: 'warning',
      title: 'Line spacing is loose',
      detail: `Line height ${lineHeight} may overflow one page. ~1.3–1.45 is typical.`,
    })
  }

  const skillCount =
    (resume.skills?.technical?.length ?? 0) +
    (resume.skills?.tools?.length ?? 0) +
    (resume.skills?.soft?.length ?? 0)
  if (skillCount === 0) {
    issues.push({
      id: 'no-skills',
      severity: 'info',
      title: 'No skills listed',
      detail: 'Adding a focused skills section can improve ATS matching.',
    })
  }

  // ATS hygiene: one date format everywhere; no generated-sounding diction.
  // Warnings only — they never block export.
  checkDateConsistency(resume, issues)
  checkAiTells(resume, issues)

  if (options?.skillsLayout === 'columns') {
    issues.push({
      id: 'skills-columns',
      severity: 'warning',
      title: 'Skills in multi-column layout',
      detail: 'Some ATS parsers read columns out of order. The categorized single-column layout parses most reliably.',
    })
  }

  const critical = issues.some(issue => issue.severity === 'critical')
  return { ok: !critical, issues }
}
