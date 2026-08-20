import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile, ProfileData, StructuredResume } from '@/types'
import { profileDataToStructuredResume, resolveProfileData, structuredResumeToProfileData } from './data'

export interface MasterResumeContext {
  structured: StructuredResume
  source: 'profile' | 'resume'
  baseResumeId: string
  profileData: ProfileData
  /** Latest uploaded/parsed resume — merged into prompts when master source is profile. */
  uploadedResume?: StructuredResume | null
}

/** True when profile_data has meaningful career content (not just empty defaults). */
export function hasProfileContent(data: ProfileData): boolean {
  const skillCount =
    data.skills.technical.length +
    data.skills.tools.length +
    data.skills.soft.length +
    data.skills.languages.length
  return Boolean(
    data.summary.trim() ||
    data.experience.length > 0 ||
    data.education.length > 0 ||
    data.projects.length > 0 ||
    skillCount > 0
  )
}

/**
 * Load the master structured resume for tailoring.
 * Reads from profiles.profile_data first; falls back to latest parsed resume.
 * Ensures a resume row exists for tailored_resumes.base_resume_id FK.
 */
export async function getMasterResumeContext(
  supabase: SupabaseClient,
  userId: string,
  preferredResumeId?: string | null
): Promise<MasterResumeContext | { error: string; status: number }> {
  const [profileRes, resumesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single<Profile>(),
    supabase
      .from('resumes')
      .select('id, structured_data, is_primary, created_at')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data
  const resumes = resumesRes.data ?? []
  const latestResume = resumes[0]?.structured_data as StructuredResume | undefined

  const profileData = resolveProfileData(profile, latestResume ?? null)
  const storedProfileData = resolveProfileData(profile, null)
  const fromProfile = hasProfileContent(storedProfileData)
  const structured = fromProfile
    ? profileDataToStructuredResume(profileData)
    : latestResume

  if (!structured || (!structured.experience?.length && !structured.summary?.trim())) {
    return { error: 'No profile or resume data found. Upload a resume or fill out your profile.', status: 404 }
  }

  let baseResumeId = preferredResumeId ?? undefined
  if (baseResumeId && !resumes.some(r => r.id === baseResumeId)) {
    baseResumeId = undefined
  }
  if (!baseResumeId) {
    const primary = resumes.find(r => r.is_primary)
    baseResumeId = primary?.id ?? resumes[0]?.id
  }

  if (!baseResumeId) {
    const { data: created, error } = await supabase
      .from('resumes')
      .insert({
        user_id: userId,
        title: 'Master Profile',
        structured_data: structured,
        is_primary: true,
      })
      .select('id')
      .single()

    if (error || !created) {
      return { error: 'Failed to create base resume record', status: 500 }
    }
    baseResumeId = created.id
  }

  if (!baseResumeId) {
    return { error: 'No base resume available', status: 500 }
  }

  return {
    structured,
    source: fromProfile ? 'profile' : 'resume',
    baseResumeId,
    profileData,
    uploadedResume: latestResume ?? null,
  }
}

/** Merge parsed resume into profiles.profile_data (master). */
export function buildProfileSeedFromParse(
  structured: StructuredResume,
  profile: Pick<Profile, 'first_name' | 'last_name' | 'email' | 'profile_data'> | null
): ProfileData {
  const parsed = structuredResumeToProfileData(structured)
  const existing = resolveProfileData(profile, null)

  // Upload seeds empty sections; don't wipe user edits on re-upload of overlapping fields.
  if (!existing.summary.trim() && parsed.summary) existing.summary = parsed.summary
  if (existing.experience.length === 0 && parsed.experience.length) existing.experience = parsed.experience
  if (existing.projects.length === 0 && parsed.projects.length) existing.projects = parsed.projects
  if (existing.education.length === 0 && parsed.education.length) existing.education = parsed.education
  if (existing.certifications.length === 0 && parsed.certifications.length) existing.certifications = parsed.certifications
  const skillCount =
    existing.skills.technical.length + existing.skills.tools.length + existing.skills.languages.length
  if (skillCount === 0 && parsed.skills) existing.skills = parsed.skills
  if (existing.urls.length === 0 && parsed.urls.length) existing.urls = parsed.urls

  const p = existing.personal
  if (!p.firstName && parsed.personal.firstName) p.firstName = parsed.personal.firstName
  if (!p.lastName && parsed.personal.lastName) p.lastName = parsed.personal.lastName
  if (!p.email && parsed.personal.email) p.email = parsed.personal.email
  if (!p.phone && parsed.personal.phone) p.phone = parsed.personal.phone
  if (!p.location && parsed.personal.location) p.location = parsed.personal.location

  return existing
}

/** Profile row updates after seeding from parse. */
export function profileRowUpdatesFromSeed(
  seed: ProfileData,
  profile: Pick<Profile, 'first_name' | 'last_name'> | null
) {
  return {
    profile_data: seed,
    first_name: profile?.first_name || seed.personal.firstName || '',
    last_name: profile?.last_name || seed.personal.lastName || '',
    updated_at: new Date().toISOString(),
  }
}
