import { describe, expect, it } from 'vitest'
import {
  emptyProfileData,
  profileDataToStructuredResume,
  resolveProfileData,
  structuredResumeToProfileData,
} from '@/lib/profile/data'
import { profileDataWithSummary, sampleProfile, sampleStructuredResume } from './fixtures'

describe('resolveProfileData', () => {
  it('returns empty defaults when profile and resume are null', () => {
    const data = resolveProfileData(null, null)
    expect(data.summary).toBe('')
    expect(data.experience).toEqual([])
    expect(data.personal.firstName).toBe('')
  })

  it('uses stored profile_data over resume when sections are filled', () => {
    const profile = sampleProfile({
      profile_data: profileDataWithSummary('Edited on profile — master source of truth'),
    })
    const resume = sampleStructuredResume({ summary: 'Old resume summary only' })

    const data = resolveProfileData(profile, resume)
    expect(data.summary).toBe('Edited on profile — master source of truth')
  })

  it('seeds empty sections from latest resume', () => {
    const profile = sampleProfile({ profile_data: emptyProfileData() })
    const resume = sampleStructuredResume()

    const data = resolveProfileData(profile, resume)
    expect(data.summary).toBe(resume.summary)
    expect(data.experience).toHaveLength(1)
    expect(data.experience[0].company).toBe('Acme Corp')
  })

  it('falls back to profile row for personal name and email', () => {
    const profile = sampleProfile({ first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' })
    const data = resolveProfileData(profile, null)
    expect(data.personal.firstName).toBe('Jane')
    expect(data.personal.lastName).toBe('Doe')
    expect(data.personal.email).toBe('jane@example.com')
  })
})

describe('profileDataToStructuredResume', () => {
  it('reflects profile edits in structured output (tailor reads this)', () => {
    const data = profileDataWithSummary('Profile summary for tailoring')
    const structured = profileDataToStructuredResume(data)

    expect(structured.summary).toBe('Profile summary for tailoring')
    expect(structured.contact.name).toBe('Jane Doe')
    expect(structured.contact.email).toBe('jane@example.com')
    expect(structured.experience).toHaveLength(1)
  })

  it('maps URL entries to contact fields', () => {
    const data = profileDataWithSummary('Summary')
    data.urls = [
      { id: 'u1', label: 'LinkedIn', url: 'https://linkedin.com/in/jane' },
      { id: 'u2', label: 'GitHub', url: 'https://github.com/jane' },
    ]
    const structured = profileDataToStructuredResume(data)
    expect(structured.contact.linkedin).toBe('https://linkedin.com/in/jane')
    expect(structured.contact.github).toBe('https://github.com/jane')
  })
})

describe('structuredResumeToProfileData', () => {
  it('converts parsed resume into profile seed shape', () => {
    const resume = sampleStructuredResume()
    const data = structuredResumeToProfileData(resume)

    expect(data.personal.firstName).toBe('Jane')
    expect(data.personal.lastName).toBe('Doe')
    expect(data.summary).toBe(resume.summary)
    expect(data.experience).toHaveLength(1)
  })
})

describe('edit profile → tailor reflects change', () => {
  it('profile summary edit flows through to structured resume used by tailor APIs', () => {
    const profile = sampleProfile({
      profile_data: profileDataWithSummary('Original summary'),
    })

    const before = profileDataToStructuredResume(resolveProfileData(profile, null))
    expect(before.summary).toBe('Original summary')

    const edited = resolveProfileData(
      {
        ...profile,
        profile_data: profileDataWithSummary('Updated after user edited profile'),
      },
      sampleStructuredResume({ summary: 'Stale resume parse — should not win' })
    )

    const after = profileDataToStructuredResume(edited)
    expect(after.summary).toBe('Updated after user edited profile')
    expect(after.summary).not.toBe(before.summary)
  })
})
