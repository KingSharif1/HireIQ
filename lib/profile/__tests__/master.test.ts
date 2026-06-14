import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildProfileSeedFromParse,
  getMasterResumeContext,
  hasProfileContent,
  profileRowUpdatesFromSeed,
} from '@/lib/profile/master'
import { emptyProfileData } from '@/lib/profile/data'
import { profileDataWithSummary, sampleProfile, sampleStructuredResume } from './fixtures'

describe('hasProfileContent', () => {
  it('returns false for empty profile', () => {
    expect(hasProfileContent(emptyProfileData())).toBe(false)
  })

  it('returns true when summary has content', () => {
    expect(hasProfileContent(profileDataWithSummary('Has summary'))).toBe(true)
  })

  it('returns true when only skills are filled', () => {
    const data = emptyProfileData()
    data.skills.technical = ['React']
    expect(hasProfileContent(data)).toBe(true)
  })
})

describe('buildProfileSeedFromParse', () => {
  it('seeds empty profile from parsed resume', () => {
    const parsed = sampleStructuredResume()
    const seed = buildProfileSeedFromParse(parsed, sampleProfile())

    expect(seed.summary).toBe(parsed.summary)
    expect(seed.experience).toHaveLength(1)
    expect(seed.personal.firstName).toBe('Jane')
  })

  it('does not overwrite existing user edits on re-upload', () => {
    const existing = profileDataWithSummary('User-written summary — keep this')
    const profile = sampleProfile({ profile_data: existing })
    const parsed = sampleStructuredResume({ summary: 'New upload would overwrite if naive' })

    const seed = buildProfileSeedFromParse(parsed, profile)
    expect(seed.summary).toBe('User-written summary — keep this')
  })

  it('fills only empty sections from parse', () => {
    const existing = emptyProfileData()
    existing.summary = 'Kept summary'
    const profile = sampleProfile({ profile_data: existing })
    const parsed = sampleStructuredResume()

    const seed = buildProfileSeedFromParse(parsed, profile)
    expect(seed.summary).toBe('Kept summary')
    expect(seed.experience).toHaveLength(1)
  })
})

describe('profileRowUpdatesFromSeed', () => {
  it('writes profile_data and name fields from seed', () => {
    const seed = profileDataWithSummary('Summary')
    const updates = profileRowUpdatesFromSeed(seed, sampleProfile({ first_name: '', last_name: '' }))

    expect(updates.profile_data).toBe(seed)
    expect(updates.first_name).toBe('Jane')
    expect(updates.last_name).toBe('Doe')
    expect(updates.updated_at).toBeTruthy()
  })
})

function mockSupabase(options: {
  profile?: ReturnType<typeof sampleProfile> | null
  resumes?: Array<{ id: string; structured_data: unknown; is_primary: boolean; created_at: string }>
  insertResumeId?: string
}) {
  const {
    profile = sampleProfile(),
    resumes = [],
    insertResumeId = 'new-resume-id',
  } = options

  const insertSingle = vi.fn().mockResolvedValue({
    data: { id: insertResumeId },
    error: null,
  })

  const from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: profile, error: null }),
          }),
        }),
      }
    }
    if (table === 'resumes') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: resumes, error: null }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: insertSingle,
          }),
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return { from, insertSingle } as unknown as SupabaseClient & { insertSingle: ReturnType<typeof vi.fn> }
}

describe('getMasterResumeContext', () => {
  it('prefers profile_data when profile has content', async () => {
    const resume = sampleStructuredResume({ summary: 'Resume-only summary' })
    const profile = sampleProfile({
      profile_data: profileDataWithSummary('Master profile summary wins'),
    })

    const supabase = mockSupabase({
      profile,
      resumes: [
        {
          id: 'resume-1',
          structured_data: resume,
          is_primary: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    })

    const result = await getMasterResumeContext(supabase, 'user-1')
    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.source).toBe('profile')
    expect(result.structured.summary).toBe('Master profile summary wins')
    expect(result.baseResumeId).toBe('resume-1')
  })

  it('falls back to latest resume when profile is empty', async () => {
    const resume = sampleStructuredResume({ summary: 'From uploaded resume' })
    const profile = sampleProfile({ profile_data: emptyProfileData() })

    const supabase = mockSupabase({
      profile,
      resumes: [
        {
          id: 'resume-1',
          structured_data: resume,
          is_primary: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    })

    const result = await getMasterResumeContext(supabase, 'user-1')
    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.source).toBe('resume')
    expect(result.structured.summary).toBe('From uploaded resume')
  })

  it('reflects profile edit in structured output used by tailor', async () => {
    const resume = sampleStructuredResume({ summary: 'Stale' })
    const profile = sampleProfile({
      profile_data: profileDataWithSummary('After profile edit'),
    })

    const supabase = mockSupabase({
      profile,
      resumes: [
        {
          id: 'resume-1',
          structured_data: resume,
          is_primary: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    })

    const result = await getMasterResumeContext(supabase, 'user-1')
    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.structured.summary).toBe('After profile edit')
  })

  it('creates base resume row when none exists', async () => {
    const profile = sampleProfile({
      profile_data: profileDataWithSummary('Profile with content'),
    })

    const supabase = mockSupabase({
      profile,
      resumes: [],
      insertResumeId: 'created-resume-id',
    })

    const result = await getMasterResumeContext(supabase, 'user-1')
    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.baseResumeId).toBe('created-resume-id')
    expect((supabase as { insertSingle: ReturnType<typeof vi.fn> }).insertSingle).toHaveBeenCalled()
  })

  it('returns 404 when no profile or resume content', async () => {
    const supabase = mockSupabase({
      profile: sampleProfile({ profile_data: emptyProfileData() }),
      resumes: [],
    })

    const result = await getMasterResumeContext(supabase, 'user-1')
    expect('error' in result).toBe(true)
    if (!('error' in result)) return

    expect(result.status).toBe(404)
  })
})
