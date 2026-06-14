import type {
  ProfileData,
  StructuredResume,
  Profile,
} from '@/types'

/** A fully-empty ProfileData object. */
export function emptyProfileData(): ProfileData {
  return {
    personal: {
      firstName: '',
      lastName: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      pronouns: '',
    },
    summary: '',
    urls: [],
    experience: [],
    volunteering: [],
    projects: [],
    education: [],
    skills: { technical: [], soft: [], tools: [], languages: [] },
    certifications: [],
    achievements: [],
    additional: '',
    additionalDocuments: [],
    attachments: [],
    provenance: {},
    pendingSuggestions: [],
  }
}

/**
 * Merge whatever is stored on the profile with a complete default shape so the
 * UI never has to null-check individual sections. Optionally seed empty
 * professional sections from the user's most recent parsed resume.
 */
export function resolveProfileData(
  profile: Pick<Profile, 'first_name' | 'last_name' | 'email' | 'profile_data'> | null,
  latestResume?: StructuredResume | null
): ProfileData {
  const base = emptyProfileData()
  const stored = profile?.profile_data ?? null

  const data: ProfileData = {
    ...base,
    ...(stored ?? {}),
    personal: { ...base.personal, ...(stored?.personal ?? {}) },
    skills: { ...base.skills, ...(stored?.skills ?? {}) },
    provenance: stored?.provenance ?? {},
    pendingSuggestions: stored?.pendingSuggestions ?? [],
  }

  // Personal info falls back to the profile row.
  if (!data.personal.firstName) data.personal.firstName = profile?.first_name ?? ''
  if (!data.personal.lastName) data.personal.lastName = profile?.last_name ?? ''
  if (!data.personal.email) data.personal.email = profile?.email ?? ''

  // Seed professional sections from the latest resume when empty.
  if (latestResume) {
    if (!data.summary && latestResume.summary) data.summary = latestResume.summary
    if (data.experience.length === 0 && latestResume.experience?.length)
      data.experience = latestResume.experience
    if (data.projects.length === 0 && latestResume.projects?.length)
      data.projects = latestResume.projects
    if (data.education.length === 0 && latestResume.education?.length)
      data.education = latestResume.education
    if (data.certifications.length === 0 && latestResume.certifications?.length)
      data.certifications = latestResume.certifications
    const hasSkills =
      data.skills.technical.length + data.skills.tools.length + data.skills.languages.length > 0
    if (!hasSkills && latestResume.skills) data.skills = { ...base.skills, ...latestResume.skills }

    const c = latestResume.contact
    if (c) {
      if (!data.personal.firstName && !data.personal.lastName && c.name) {
        const [first, ...rest] = c.name.split(' ')
        data.personal.firstName = first ?? ''
        data.personal.lastName = rest.join(' ')
      }
      if (!data.personal.email) data.personal.email = c.email ?? ''
      if (!data.personal.phone) data.personal.phone = c.phone ?? ''
      if (!data.personal.location) data.personal.location = c.location ?? ''

      if (data.urls.length === 0) {
        const seeded = [
          c.linkedin && { label: 'LinkedIn', url: c.linkedin },
          c.github && { label: 'GitHub', url: c.github },
          (c.portfolio || c.website) && { label: 'Website', url: c.portfolio || c.website },
        ].filter(Boolean) as { label: string; url: string }[]
        data.urls = seeded.map((u, i) => ({ id: `seed-url-${i}`, ...u }))
      }
    }
  }

  return data
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

/** Convert master ProfileData → StructuredResume for tailoring / scoring. */
export function profileDataToStructuredResume(data: ProfileData): StructuredResume {
  const p = data.personal
  const findUrl = (pattern: RegExp) => data.urls.find(u => pattern.test(u.label))?.url ?? ''

  return {
    contact: {
      name: [p.firstName, p.lastName].filter(Boolean).join(' '),
      email: p.email,
      phone: p.phone,
      location: p.location,
      linkedin: findUrl(/linkedin/i),
      github: findUrl(/github/i),
      portfolio: findUrl(/portfolio/i) || findUrl(/website/i),
      website: findUrl(/website/i) || findUrl(/portfolio/i),
    },
    summary: data.summary,
    experience: data.experience,
    education: data.education,
    skills: data.skills,
    projects: data.projects,
    certifications: data.certifications,
    volunteer: data.volunteering,
    awards: data.achievements,
  }
}

/** Convert a parsed StructuredResume → ProfileData for seeding the master profile. */
export function structuredResumeToProfileData(resume: StructuredResume): ProfileData {
  const base = emptyProfileData()
  const c = resume.contact ?? ({} as StructuredResume['contact'])
  const [first, ...rest] = (c.name ?? '').split(' ').filter(Boolean)

  const urls = [
    c.linkedin && { label: 'LinkedIn', url: c.linkedin },
    c.github && { label: 'GitHub', url: c.github },
    (c.portfolio || c.website) && { label: 'Website', url: c.portfolio || c.website },
  ].filter(Boolean) as { label: string; url: string }[]

  return {
    ...base,
    personal: {
      firstName: first ?? '',
      lastName: rest.join(' '),
      headline: '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      location: c.location ?? '',
      pronouns: '',
    },
    summary: resume.summary ?? '',
    urls: urls.map((u, i) => ({ id: `url-${i}`, ...u })),
    experience: resume.experience ?? [],
    projects: resume.projects ?? [],
    education: resume.education ?? [],
    skills: resume.skills ?? base.skills,
    certifications: resume.certifications ?? [],
  }
}
