import type { ProfileData } from '@/types'
import { normalizeProfileData } from '@/lib/profile/provenance'
import { normalizeApplyAnswers } from '@/lib/profile/apply-answers'

const MAX_CONTEXT_CHARS = 6000

export type KnownSensitiveFacts = {
  years_experience?: string
  country?: string
  work_authorization?: string
  sponsorship?: string
  relocation?: string
  work_setting?: string
  date_of_birth?: string
  desired_salary?: string
  gender?: string
  race_ethnicity?: string
  veteran_status?: string
  disability_status?: string
}

const CHOICE_LABELS: Record<string, string> = {
  yes: 'Yes',
  no: 'No',
  prefer_not: 'Prefer not to answer',
  male: 'Male',
  female: 'Female',
  non_binary: 'Non-binary',
  other: 'Other',
  american_indian_alaska_native: 'American Indian or Alaska Native',
  asian: 'Asian',
  black_african_american: 'Black or African American',
  hispanic_latino: 'Hispanic or Latino',
  middle_eastern_north_african: 'Middle Eastern or North African',
  native_hawaiian_pacific_islander: 'Native Hawaiian or Other Pacific Islander',
  white: 'White',
  two_or_more: 'Two or more races',
  not_protected_veteran: 'I am not a protected veteran',
  protected_veteran: 'I identify as a protected veteran',
}

function choiceLabel(value: string): string {
  return CHOICE_LABELS[value] ?? value
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
  const data = normalizeProfileData(profileData ?? ({} as ProfileData))
  const answers = normalizeApplyAnswers(data.applyAnswers)
  const auth = answers.workAuthorizedUS
  if (auth === 'yes') facts.work_authorization = 'Authorized to work in the United States'
  if (auth === 'no') facts.work_authorization = 'Not authorized to work in the United States without sponsorship'
  if (answers.country) facts.country = answers.country
  if (answers.requiresSponsorship) facts.sponsorship = choiceLabel(answers.requiresSponsorship)
  if (answers.willingToRelocate) facts.relocation = choiceLabel(answers.willingToRelocate)
  if (answers.inOfficeOk) facts.work_setting = choiceLabel(answers.inOfficeOk)
  if (answers.dateOfBirth) facts.date_of_birth = answers.dateOfBirth
  if (answers.desiredSalaryMin || answers.desiredSalaryMax) {
    const minimum = answers.desiredSalaryMin ? `$${answers.desiredSalaryMin}` : 'No minimum set'
    const maximum = answers.desiredSalaryMax ? `$${answers.desiredSalaryMax}` : 'No maximum set'
    facts.desired_salary = `${minimum} to ${maximum} annual base salary`
  }
  if (answers.gender) facts.gender = choiceLabel(answers.gender)
  if (answers.ethnicity) facts.race_ethnicity = choiceLabel(answers.ethnicity)
  if (answers.veteran) facts.veteran_status = choiceLabel(answers.veteran)
  if (answers.disability) facts.disability_status = choiceLabel(answers.disability)
  return facts
}
