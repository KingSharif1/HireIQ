import { normalizeSkill } from '@/lib/scoring/keyword-extractor'
import { canonicalSkillId } from '@/lib/profile/skills'
import type {
  JobExtractedData,
  ProfileData,
  ResumeInclusion,
  ResumeProject,
  StructuredResume,
} from '@/types'

function jobTokens(job: JobExtractedData): Set<string> {
  const raw = [
    ...(job.required_skills ?? []),
    ...(job.preferred_skills ?? []),
    ...(job.keywords ?? []),
    ...(job.responsibilities ?? []).slice(0, 8),
    job.title ?? '',
    job.summary ?? '',
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

/** Higher = more useful for this JD (ATS + recruiter skim). */
export function scoreProjectForJob(project: ResumeProject, job: JobExtractedData): number {
  const tokens = jobTokens(job)
  const blob = [
    project.name,
    project.description,
    ...(project.bullets ?? []),
    ...(project.technologies ?? []),
  ].join(' ')
  const techHits = (project.technologies ?? []).filter(t =>
    tokens.has(normalizeSkill(t))
  ).length
  return textHits(blob, tokens) + techHits * 2
}

export function rankProjectsForJob(
  projects: ResumeProject[],
  job: JobExtractedData
): { project: ResumeProject; score: number }[] {
  return [...projects]
    .map(project => ({ project, score: scoreProjectForJob(project, job) }))
    .sort((a, b) => b.score - a.score)
}

/**
 * Keep projects that share tools/language with the JD.
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
