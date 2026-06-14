import type { Profile, ProfileData, StructuredResume } from '@/types'
import { emptyProfileData } from '@/lib/profile/data'

export function sampleStructuredResume(overrides: Partial<StructuredResume> = {}): StructuredResume {
  return {
    contact: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-0100',
      location: 'Austin, TX',
      linkedin: 'https://linkedin.com/in/jane',
      github: '',
      portfolio: '',
      website: '',
    },
    summary: 'Software engineer with 5 years of experience.',
    experience: [
      {
        id: 'exp-1',
        company: 'Acme Corp',
        title: 'Software Engineer',
        location: 'Remote',
        startDate: '2020-01',
        endDate: '',
        current: true,
        bullets: ['Built APIs with Node.js'],
        skills_used: ['Node.js'],
      },
    ],
    education: [],
    skills: { technical: ['TypeScript'], soft: [], tools: [], languages: [] },
    projects: [],
    certifications: [],
    volunteer: [],
    awards: [],
    ...overrides,
  }
}

export function sampleProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    first_name: 'Jane',
    last_name: 'Doe',
    username: null,
    email: 'jane@example.com',
    target_role: null,
    years_experience: null,
    profile_data: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function profileDataWithSummary(summary: string): ProfileData {
  const data = emptyProfileData()
  data.personal.firstName = 'Jane'
  data.personal.lastName = 'Doe'
  data.personal.email = 'jane@example.com'
  data.summary = summary
  data.experience = sampleStructuredResume().experience
  return data
}
