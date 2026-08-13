import type { StructuredResume } from '@/types'

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

/** Pre-export sanity checks — length, placeholders, empty sections. */
export function runResumeLayoutCheck(
  resume: StructuredResume,
  options?: { pageCount?: number },
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

  const critical = issues.some(issue => issue.severity === 'critical')
  return { ok: !critical, issues }
}
