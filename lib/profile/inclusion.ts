import type { ProfileData, ResumeInclusion, StructuredResume } from '@/types'
import { profileDataToStructuredResume } from '@/lib/profile/data'
import { canonicalSkillId } from '@/lib/profile/skills'

/** Apply include/exclude map to structured resume for preview/export. Missing map = all included. */
export function applyInclusion(
  data: ProfileData,
  inclusion: ResumeInclusion | null | undefined
): StructuredResume {
  const full = profileDataToStructuredResume(data)
  if (!inclusion) return full

  const expIds = inclusion.experienceIds
  const bulletSet = inclusion.bulletIds ? new Set(inclusion.bulletIds) : null
  const projectIds = inclusion.projectIds ? new Set(inclusion.projectIds) : null
  const eduIds = inclusion.educationIds ? new Set(inclusion.educationIds) : null
  const skillSet = inclusion.skillIds
    ? new Set(inclusion.skillIds.map(canonicalSkillId))
    : null

  const experience = full.experience
    .filter(e => !expIds || expIds.includes(e.id))
    .map(e => {
      if (!bulletSet) return e
      const pairs = (e.bullets ?? []).map((b, i) => ({
        text: b,
        id: e.bulletIds?.[i] ?? `${e.id}-${i}`,
      }))
      const kept = pairs.filter(p => bulletSet.has(p.id))
      return {
        ...e,
        bullets: kept.map(p => p.text),
        bulletIds: kept.map(p => p.id),
      }
    })

  const projects = full.projects
    .filter(p => !projectIds || projectIds.has(p.id))
    .map(p => {
      if (!bulletSet) return p
      const pairs = (p.bullets ?? []).map((b, i) => ({
        text: b,
        id: p.bulletIds?.[i] ?? `${p.id}-${i}`,
      }))
      const kept = pairs.filter(x => bulletSet.has(x.id))
      return {
        ...p,
        bullets: kept.map(x => x.text),
        bulletIds: kept.map(x => x.id),
      }
    })

  const education = full.education.filter(e => !eduIds || eduIds.has(e.id))

  let skills = full.skills
  if (skillSet) {
    const filter = (arr: string[]) => arr.filter(s => skillSet.has(canonicalSkillId(s)))
    skills = {
      technical: filter(skills.technical ?? []),
      soft: filter(skills.soft ?? []),
      tools: filter(skills.tools ?? []),
      languages: filter(skills.languages ?? []),
    }
  }

  const summary =
    inclusion.sectionIds && !inclusion.sectionIds.includes('summary')
      ? ''
      : full.summary

  return {
    ...full,
    summary,
    experience,
    projects,
    education,
    skills,
  }
}

export function isIncluded(
  inclusion: ResumeInclusion | null | undefined,
  kind: 'bullet' | 'experience' | 'project' | 'education' | 'skill' | 'section',
  id: string
): boolean {
  if (!inclusion) return true
  switch (kind) {
    case 'bullet':
      return !inclusion.bulletIds || inclusion.bulletIds.includes(id)
    case 'experience':
      return !inclusion.experienceIds || inclusion.experienceIds.includes(id)
    case 'project':
      return !inclusion.projectIds || inclusion.projectIds.includes(id)
    case 'education':
      return !inclusion.educationIds || inclusion.educationIds.includes(id)
    case 'skill':
      return (
        !inclusion.skillIds ||
        inclusion.skillIds.some(skillId => canonicalSkillId(skillId) === canonicalSkillId(id))
      )
    case 'section':
      return !inclusion.sectionIds || inclusion.sectionIds.includes(id)
    default:
      return true
  }
}

export function toggleInclusionId(
  inclusion: ResumeInclusion,
  key: keyof ResumeInclusion,
  id: string,
  allIds: string[],
  checked: boolean
): ResumeInclusion {
  const normalize = (value: string) => key === 'skillIds' ? canonicalSkillId(value) : value
  const normalizedId = normalize(id)
  const current = ((inclusion[key] as string[] | undefined) ?? allIds).map(normalize)
  const next = checked
    ? Array.from(new Set([...current, normalizedId]))
    : current.filter(x => x !== normalizedId)
  return { ...inclusion, [key]: next }
}
