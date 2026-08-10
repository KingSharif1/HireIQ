import type { ProfileData } from '@/types'
import { normalizeProfileData } from '@/lib/profile/provenance'

const MAX_CONTEXT_CHARS = 6000

export type KnownSensitiveFacts = {
  years_experience?: string
  work_authorization?: string
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

/**
 * Compact resume summary for autofill AI (summary + experience + skills).
 * Hard-capped ~6k chars.
 */
export function buildResumeContext(profileData: ProfileData | null | undefined): string {
  const data = normalizeProfileData(profileData ?? ({} as ProfileData))
  const lines: string[] = []

  const name = [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ')
  if (name) lines.push(`Name: ${name}`)
  if (data.personal.headline?.trim()) lines.push(`Headline: ${data.personal.headline.trim()}`)
  if (data.personal.location?.trim()) lines.push(`Location: ${data.personal.location.trim()}`)
  if (data.personal.email?.trim()) lines.push(`Email: ${data.personal.email.trim()}`)
  if (data.personal.phone?.trim()) lines.push(`Phone: ${data.personal.phone.trim()}`)
  if (data.summary?.trim()) lines.push(`Summary: ${clip(data.summary.trim(), 800)}`)

  if (data.experience.length > 0) {
    lines.push('Experience:')
    for (const exp of data.experience.slice(0, 6)) {
      const dates = [exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).join(' – ')
      lines.push(`- ${exp.title || 'Role'} @ ${exp.company || 'Company'}${dates ? ` (${dates})` : ''}`)
      for (const b of (exp.bullets || []).slice(0, 3)) {
        if (b?.trim()) lines.push(`  • ${clip(b.trim(), 220)}`)
      }
    }
  }

  if (data.education.length > 0) {
    lines.push('Education:')
    for (const ed of data.education.slice(0, 3)) {
      const bits = [ed.degree, ed.field, ed.institution].filter(Boolean).join(', ')
      if (bits) lines.push(`- ${bits}`)
    }
  }

  const skills = [
    ...(data.skills.technical || []),
    ...(data.skills.tools || []),
    ...(data.skills.languages || []),
    ...(data.skills.soft || []),
  ].filter(Boolean)
  if (skills.length > 0) {
    lines.push(`Skills: ${skills.slice(0, 40).join(', ')}`)
  }

  if (data.projects.length > 0) {
    lines.push('Projects:')
    for (const p of data.projects.slice(0, 3)) {
      lines.push(`- ${p.name}${p.description ? `: ${clip(p.description, 160)}` : ''}`)
    }
  }

  return clip(lines.join('\n'), MAX_CONTEXT_CHARS)
}

/**
 * Minimal sensitive facts we actually store — never invent work auth / EEOC.
 * `yearsExperience` may come from the profiles.years_experience column.
 */
export function extractKnownSensitiveFacts(
  profileData: ProfileData | null | undefined,
  yearsExperience?: number | null,
): KnownSensitiveFacts {
  const facts: KnownSensitiveFacts = {}
  if (typeof yearsExperience === 'number' && Number.isFinite(yearsExperience) && yearsExperience >= 0) {
    facts.years_experience = String(yearsExperience)
  }
  // No dedicated work-auth / EEOC / salary fields on profile today — omit rather than invent.
  void profileData
  return facts
}
