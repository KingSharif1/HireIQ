import { normalizeSkill } from '@/lib/scoring/keyword-extractor'
import { canonicalSkillId } from '@/lib/profile/skills'
import type {
  JobExtractedData,
  ProfileData,
  ResumeInclusion,
  ResumeProject,
  StructuredResume,
} from '@/types'

/** Domains we can infer from JD / project text when analyze tags are missing. */
export const DOMAIN_LEXICONS: Record<string, readonly string[]> = {
  embedded: [
    'embedded',
    'firmware',
    'rtos',
    'mcu',
    'microcontroller',
    'bare metal',
    'device driver',
    'kernel',
    'fpga',
    'bare-metal',
  ],
  hardware: [
    'hardware',
    'lidar',
    'ros',
    'ros 2',
    'robot',
    'robotics',
    'raspberry',
    'raspberry pi',
    'sensor',
    'actuator',
    'gpio',
    'arduino',
    'mechatronic',
    'pcb',
    'fpga',
  ],
  controls: [
    'control system',
    'controls',
    'pid',
    'plc',
    'scada',
    'industrial control',
    'automation',
    'motion control',
  ],
  web: [
    'react',
    'next.js',
    'frontend',
    'front-end',
    'backend',
    'back-end',
    'full stack',
    'fullstack',
    'node.js',
    'typescript',
    'javascript',
    'rest api',
    'saas',
    'web app',
    'web application',
    'django',
    'express',
  ],
  cloud: ['aws', 'azure', 'gcp', 'kubernetes', 'docker', 'terraform', 'cloud'],
  data: [
    'sql',
    'etl',
    'spark',
    'data pipeline',
    'analytics',
    'machine learning',
    'ml ',
    'pytorch',
    'tensorflow',
  ],
  mobile: ['ios', 'android', 'react native', 'swift', 'kotlin', 'mobile app'],
}

function jobTokens(job: JobExtractedData): Set<string> {
  const raw = [
    ...(job.required_skills ?? []),
    ...(job.preferred_skills ?? []),
    ...(job.keywords ?? []),
    ...(job.responsibilities ?? []).slice(0, 8),
    job.title ?? '',
    job.summary ?? '',
    job.role_thesis ?? '',
    ...(job.domain_tags ?? []),
  ]
  const out = new Set<string>()
  for (const item of raw) {
    const n = normalizeSkill(item)
    if (n.length >= 2) out.add(n)
    for (const word of item.toLowerCase().split(/[^a-z0-9+#.]+/).filter(w => w.length > 2)) {
      out.add(normalizeSkill(word))
    }
  }
  return out
}

function textHits(text: string, tokens: Set<string>): number {
  const hay = text.toLowerCase()
  let hits = 0
  for (const token of tokens) {
    if (token.length < 2) continue
    if (hay.includes(token) || hay.includes(token.replace(/\+/g, 'plus'))) hits += 1
  }
  return hits
}

function projectBlob(project: ResumeProject): string {
  return [
    project.name,
    project.description,
    ...(project.bullets ?? []),
    ...(project.technologies ?? []),
  ].join(' ')
}

/** True when JD has little concrete signal — keyword bag alone is unreliable. */
export function isSparseJob(job: JobExtractedData): boolean {
  const skills = (job.required_skills?.length ?? 0) + (job.preferred_skills?.length ?? 0)
  const keywords = job.keywords?.length ?? 0
  const resp = job.responsibilities?.length ?? 0
  const summaryLen = (job.summary ?? '').trim().length
  const hasThesis = Boolean(job.role_thesis?.trim() || (job.domain_tags?.length ?? 0) > 0)
  if (hasThesis) return false
  return skills + keywords < 4 && resp < 3 && summaryLen < 280
}

/**
 * Prefer analyze-time domain_tags; otherwise infer from JD text via lexicons.
 */
export function resolveJobDomainTags(job: JobExtractedData): string[] {
  const stored = (job.domain_tags ?? [])
    .map(t => t.trim().toLowerCase())
    .filter(Boolean)
  if (stored.length > 0) return [...new Set(stored)]

  const hay = [
    job.title,
    job.summary,
    job.role_thesis,
    ...(job.required_skills ?? []),
    ...(job.preferred_skills ?? []),
    ...(job.keywords ?? []),
    ...(job.responsibilities ?? []),
  ]
    .join(' ')
    .toLowerCase()

  const inferred: string[] = []
  for (const [domain, terms] of Object.entries(DOMAIN_LEXICONS)) {
    if (terms.some(term => hay.includes(term))) inferred.push(domain)
  }
  return inferred
}

/** How strongly a project matches inferred/stored JD domains (0 = none). */
export function domainAffinityScore(project: ResumeProject, domains: string[]): number {
  if (domains.length === 0) return 0
  const hay = projectBlob(project).toLowerCase()
  let score = 0
  for (const domain of domains) {
    const terms = DOMAIN_LEXICONS[domain]
    if (!terms) continue
    let hits = 0
    for (const term of terms) {
      if (hay.includes(term)) hits += 1
    }
    if (hits > 0) score += 3 + Math.min(hits, 4)
  }
  return score
}

export type RankedProject = {
  project: ResumeProject
  score: number
  keywordScore: number
  domainScore: number
  reasons: string[]
}

/** Higher = more useful for this JD (ATS + recruiter skim + domain thesis). */
export function scoreProjectForJob(project: ResumeProject, job: JobExtractedData): number {
  return rankOneProject(project, job).score
}

function rankOneProject(project: ResumeProject, job: JobExtractedData): RankedProject {
  const tokens = jobTokens(job)
  const blob = projectBlob(project)
  const keywordHits = textHits(blob, tokens)
  const techHits = (project.technologies ?? []).filter(t =>
    tokens.has(normalizeSkill(t))
  ).length
  const keywordScore = keywordHits + techHits * 2

  const domains = resolveJobDomainTags(job)
  const domainScore = domainAffinityScore(project, domains)
  const sparse = isSparseJob(job)
  // When JD tokens are thin, domain affinity carries the ranking (Emerson → Mapping Robot).
  const domainWeight = sparse || domains.length > 0 ? (sparse ? 2.5 : 1.5) : 1
  const score = keywordScore + domainScore * domainWeight

  const reasons: string[] = []
  if (domainScore > 0 && domains.length) {
    reasons.push(`domain: ${domains.filter(d => domainAffinityScore(project, [d]) > 0).join(', ')}`)
  }
  if (keywordScore > 0) reasons.push(`keyword hits: ${keywordScore}`)
  if (reasons.length === 0) reasons.push('fallback strength')

  return { project, score, keywordScore, domainScore, reasons }
}

export function rankProjectsForJob(
  projects: ResumeProject[],
  job: JobExtractedData
): RankedProject[] {
  return [...projects]
    .map(project => rankOneProject(project, job))
    .sort((a, b) => b.score - a.score || a.project.name.localeCompare(b.project.name))
}

/**
 * Keep projects that share tools/language/domain with the JD.
 * Always keep at least one strongest project when any exist.
 */
export function selectRelevantProjectIds(
  projects: ResumeProject[],
  job: JobExtractedData,
  opts?: { minScore?: number; maxProjects?: number }
): string[] {
  const minScore = opts?.minScore ?? 1
  const maxProjects = opts?.maxProjects ?? 4
  if (projects.length === 0) return []
  const ranked = rankProjectsForJob(projects, job)
  const picked = ranked.filter(r => r.score >= minScore).slice(0, maxProjects)
  if (picked.length > 0) return picked.map(r => r.project.id)
  return [ranked[0].project.id]
}

/** Prompt block: pre-select top projects so the model does not bag-of-tokens rank alone. */
export function formatPreferredProjectsForPrompt(
  projects: ResumeProject[],
  job: JobExtractedData,
  opts?: { maxProjects?: number }
): string {
  const maxProjects = opts?.maxProjects ?? 3
  if (projects.length === 0) return ''
  const ranked = rankProjectsForJob(projects, job).slice(0, maxProjects)
  const thesis = job.role_thesis?.trim()
  const domains = resolveJobDomainTags(job)
  const lines = [
    'PREFERRED PROJECTS FOR THIS JD (code-ranked — lead with these in order unless evidence clearly contradicts):',
  ]
  if (thesis) lines.push(`Role thesis: ${thesis}`)
  if (domains.length) lines.push(`Domain tags: ${domains.join(', ')}`)
  ranked.forEach((r, i) => {
    const techs = (r.project.technologies ?? []).slice(0, 6).join(', ')
    lines.push(
      `${i + 1}. ${r.project.name}${techs ? ` [${techs}]` : ''} — ${r.reasons.join('; ')}`,
    )
  })
  return lines.join('\n')
}

export function selectRelevantSkillIds(data: ProfileData, job: JobExtractedData): string[] {
  const tokens = jobTokens(job)
  const all = [
    ...(data.skills.technical ?? []),
    ...(data.skills.tools ?? []),
    ...(data.skills.languages ?? []),
  ]
  const relevant = all.filter(s => tokens.has(normalizeSkill(s)))
  // Prefer relevant first, but keep enough of the rest so the resume isn’t empty.
  const rest = all.filter(s => !tokens.has(normalizeSkill(s)))
  const ordered = [...relevant, ...rest].slice(0, Math.max(relevant.length, 12))
  return ordered.map(s => canonicalSkillId(s))
}

/** Default include map when opening a job resume from the master — ATS-focused. */
export function buildJobOptimizedInclusion(
  data: ProfileData,
  job: JobExtractedData | null | undefined
): ResumeInclusion {
  if (!job) return {}
  const projectIds = selectRelevantProjectIds(data.projects ?? [], job)
  const skillIds = selectRelevantSkillIds(data, job)
  return {
    sectionIds: ['contact', 'summary', 'title'],
    experienceIds: (data.experience ?? []).map(e => e.id),
    educationIds: (data.education ?? []).map(e => e.id),
    projectIds,
    skillIds,
    bulletIds: [
      ...(data.experience ?? []).flatMap(e =>
        (e.bullets ?? []).map((_, i) => e.bulletIds?.[i] ?? `${e.id}-${i}`)
      ),
      ...(data.projects ?? [])
        .filter(p => projectIds.includes(p.id))
        .flatMap(p =>
          (p.bullets ?? []).map((_, i) => p.bulletIds?.[i] ?? `${p.id}-${i}`)
        ),
    ],
  }
}

/** Drop low-relevance projects from a structured snapshot before save/export. */
export function filterResumeToRelevantProjects(
  resume: StructuredResume,
  job: JobExtractedData
): StructuredResume {
  const keep = new Set(selectRelevantProjectIds(resume.projects ?? [], job))
  return {
    ...resume,
    projects: (resume.projects ?? []).filter(p => keep.has(p.id)),
  }
}
