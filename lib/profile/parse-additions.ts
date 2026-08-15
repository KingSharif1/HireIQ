import type { ProfileData, ResumeExperience, ResumeProject, StructuredResume } from '@/types'
import { nameMentioned, normalizeMatchKey } from '@/lib/profile/route-gap-answer'

function sameName(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false
  return normalizeMatchKey(a) === normalizeMatchKey(b) || nameMentioned(a, b) || nameMentioned(b, a)
}

export type ParseAdditions = {
  experience: ResumeExperience[]
  projects: ResumeProject[]
  skills: string[]
}

export function parseAdditions(parsed: StructuredResume, profile: ProfileData): ParseAdditions {
  const experience = (parsed.experience ?? []).filter(
    incoming =>
      !profile.experience.some(
        existing => sameName(existing.company, incoming.company) && sameName(existing.title, incoming.title)
      )
  )
  const projects = (parsed.projects ?? []).filter(
    incoming => !profile.projects.some(existing => sameName(existing.name, incoming.name))
  )
  const existingSkills = new Set(
    [
      ...profile.skills.technical,
      ...profile.skills.tools,
      ...profile.skills.languages,
    ].map(s => s.toLowerCase())
  )
  const skills = [...(parsed.skills?.technical ?? []), ...(parsed.skills?.tools ?? [])].filter(
    skill => skill.trim() && !existingSkills.has(skill.toLowerCase())
  )
  return { experience, projects, skills: [...new Set(skills)].slice(0, 24) }
}

export function hasParseAdditions(additions: ParseAdditions): boolean {
  return additions.experience.length + additions.projects.length + additions.skills.length > 0
}

export function applyParseAdditions(profile: ProfileData, additions: ParseAdditions): ProfileData {
  return {
    ...profile,
    experience: [...additions.experience, ...profile.experience],
    projects: [...additions.projects, ...profile.projects],
    skills: {
      ...profile.skills,
      technical: [
        ...profile.skills.technical,
        ...additions.skills.filter(
          s => !profile.skills.technical.some(t => t.toLowerCase() === s.toLowerCase())
        ),
      ],
    },
  }
}
