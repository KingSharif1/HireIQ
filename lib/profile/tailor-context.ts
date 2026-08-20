import type { ProfileData, StructuredResume } from '@/types'
import type { MasterResumeContext } from '@/lib/profile/master'
import { structuredResumeToMarkdown } from '@/lib/resume/markdown'
import { normalizeMatchKey } from '@/lib/profile/route-gap-answer'

const MAX_CONTEXT_CHARS = 14_000
const SENSITIVE_QUESTION =
  /\b(race|ethnic|gender|sex|veteran|disabilit|lgbt|religion|ssn|social security|dob|date of birth|conviction|criminal|salary|compensation|wage|sponsor)\b/i

export interface PriorEnhancement {
  question: string
  answer: string
}

export interface TailorPromptContext {
  resumeMarkdown: string
  profileContext: string
}

function normalizeBullet(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function mergeExperienceBullets(
  target: StructuredResume['experience'][number],
  source: StructuredResume['experience'][number]
): void {
  const seen = new Set(target.bullets.map(normalizeBullet))
  for (const bullet of source.bullets) {
    const key = normalizeBullet(bullet)
    if (!key || seen.has(key)) continue
    target.bullets.push(bullet)
    seen.add(key)
  }
  const skills = new Set([...(target.skills_used ?? []), ...(source.skills_used ?? [])])
  target.skills_used = [...skills]
}

function mergeProjectBullets(
  target: StructuredResume['projects'][number],
  source: StructuredResume['projects'][number]
): void {
  const seen = new Set(target.bullets.map(normalizeBullet))
  for (const bullet of source.bullets) {
    const key = normalizeBullet(bullet)
    if (!key || seen.has(key)) continue
    target.bullets.push(bullet)
    seen.add(key)
  }
  const tech = new Set([...(target.technologies ?? []), ...(source.technologies ?? [])])
  target.technologies = [...tech]
}

function mergeSkills(
  target: StructuredResume['skills'],
  source: StructuredResume['skills']
): StructuredResume['skills'] {
  const uniq = (values: string[]) => [...new Set(values.map(v => v.trim()).filter(Boolean))]
  return {
    technical: uniq([...(target.technical ?? []), ...(source.technical ?? [])]),
    soft: uniq([...(target.soft ?? []), ...(source.soft ?? [])]),
    tools: uniq([...(target.tools ?? []), ...(source.tools ?? [])]),
    languages: uniq([...(target.languages ?? []), ...(source.languages ?? [])]),
  }
}

/**
 * When the master comes from profile edits, fold in richer bullets/roles from the
 * uploaded resume so tailoring still sees everything we know.
 */
export function mergeUploadedResumeEvidence(
  structured: StructuredResume,
  uploadedResume: StructuredResume | null | undefined,
  source: MasterResumeContext['source']
): StructuredResume {
  if (!uploadedResume || source === 'resume') return structured

  const merged: StructuredResume = {
    ...structured,
    experience: structured.experience.map(e => ({ ...e, bullets: [...e.bullets] })),
    projects: structured.projects.map(p => ({ ...p, bullets: [...p.bullets] })),
    skills: { ...structured.skills },
    volunteer: [...(structured.volunteer ?? [])],
    awards: [...(structured.awards ?? [])],
  }

  for (const srcExp of uploadedResume.experience ?? []) {
    const match = merged.experience.find(
      e =>
        normalizeMatchKey(e.company) === normalizeMatchKey(srcExp.company) ||
        (normalizeMatchKey(e.title) === normalizeMatchKey(srcExp.title) &&
          normalizeMatchKey(e.company) === normalizeMatchKey(srcExp.company))
    )
    if (match) {
      mergeExperienceBullets(match, srcExp)
      continue
    }
    merged.experience.push({ ...srcExp, bullets: [...srcExp.bullets] })
  }

  for (const srcProj of uploadedResume.projects ?? []) {
    const match = merged.projects.find(p => normalizeMatchKey(p.name) === normalizeMatchKey(srcProj.name))
    if (match) {
      mergeProjectBullets(match, srcProj)
      continue
    }
    merged.projects.push({ ...srcProj, bullets: [...srcProj.bullets] })
  }

  merged.skills = mergeSkills(merged.skills, uploadedResume.skills ?? merged.skills)

  if (!merged.summary?.trim() && uploadedResume.summary?.trim()) {
    merged.summary = uploadedResume.summary
  }

  return merged
}

/** Extra profile facts that are not always visible in resume markdown alone. */
export function formatSupplementaryProfileContext(
  profileData: ProfileData,
  options?: { priorEnhancements?: PriorEnhancement[] }
): string {
  const sections: string[] = []
  const p = profileData.personal

  if (p.headline?.trim()) sections.push(`Headline: ${p.headline.trim()}`)
  if (p.pronouns?.trim()) sections.push(`Pronouns: ${p.pronouns.trim()}`)

  if (profileData.urls?.length) {
    const links = profileData.urls
      .filter(u => u.url?.trim())
      .map(u => `- ${u.label || 'Link'}: ${u.url.trim()}`)
    if (links.length) sections.push(`Profile links:\n${links.join('\n')}`)
  }

  if (profileData.achievements?.length) {
    const lines = profileData.achievements.map(a => {
      const head = [a.title, a.issuer, a.date].filter(Boolean).join(' · ')
      return a.description?.trim() ? `- ${head}: ${a.description.trim()}` : `- ${head}`
    })
    sections.push(`Achievements:\n${lines.join('\n')}`)
  }

  if (profileData.volunteering?.length) {
    const lines = profileData.volunteering.flatMap(v => {
      const head = [v.role, v.organization].filter(Boolean).join(' @ ')
      const dates = [v.startDate, v.current ? 'Present' : v.endDate].filter(Boolean).join(' – ')
      const bits = [`- ${head}${dates ? ` (${dates})` : ''}`]
      for (const b of v.bullets ?? []) {
        if (b.trim()) bits.push(`  • ${b.trim()}`)
      }
      return bits
    })
    sections.push(`Volunteering:\n${lines.join('\n')}`)
  }

  if (profileData.additional?.trim()) {
    sections.push(`Additional notes (user-written):\n${profileData.additional.trim()}`)
  }

  const saved = profileData.applyAnswers?.saved ?? []
  const careerSaved = saved.filter(s => s.answer?.trim() && !SENSITIVE_QUESTION.test(s.question))
  if (careerSaved.length) {
    sections.push(
      'Saved application answers (career facts — honest evidence only):\n' +
        careerSaved
          .slice(0, 12)
          .map(s => `Q: ${s.question.trim()}\nA: ${s.answer.trim()}`)
          .join('\n\n')
    )
  }

  const pending = profileData.pendingSuggestions ?? []
  if (pending.length) {
    sections.push(
      'Pending profile additions (not yet accepted onto master — ask before assuming):\n' +
        pending
          .slice(0, 8)
          .map(s => `- [${s.section}] ${s.proposedText.trim()} — ${s.reason.trim()}`)
          .join('\n')
    )
  }

  const prior = options?.priorEnhancements?.filter(e => e.question?.trim() && e.answer?.trim()) ?? []
  if (prior.length) {
    sections.push(
      'Prior gap Q&A from earlier tailors (reuse as evidence when true):\n' +
        prior
          .slice(0, 10)
          .map(e => `Q: ${e.question.trim()}\nA: ${e.answer.trim()}`)
          .join('\n\n')
    )
  }

  if (sections.length === 0) {
    return 'No supplementary profile notes beyond the master resume markdown.'
  }

  const body = sections.join('\n\n')
  if (body.length <= MAX_CONTEXT_CHARS) return body
  return `${body.slice(0, MAX_CONTEXT_CHARS)}\n…[truncated]`
}

export function buildTailorPromptContext(input: {
  master: MasterResumeContext
  priorEnhancements?: PriorEnhancement[]
}): TailorPromptContext {
  const merged = mergeUploadedResumeEvidence(
    input.master.structured,
    input.master.uploadedResume,
    input.master.source
  )
  return {
    resumeMarkdown: structuredResumeToMarkdown(merged),
    profileContext: formatSupplementaryProfileContext(input.master.profileData, {
      priorEnhancements: input.priorEnhancements,
    }),
  }
}
