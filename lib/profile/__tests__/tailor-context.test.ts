import { describe, expect, it } from 'vitest'
import { emptyProfileData } from '@/lib/profile/data'
import { sampleStructuredResume } from '@/lib/profile/__tests__/fixtures'
import {
  buildTailorPromptContext,
  formatSupplementaryProfileContext,
  mergeUploadedResumeEvidence,
} from '@/lib/profile/tailor-context'
import type { MasterResumeContext } from '@/lib/profile/master'

describe('mergeUploadedResumeEvidence', () => {
  it('merges extra bullets from uploaded resume when master source is profile', () => {
    const profileResume = sampleStructuredResume({
      experience: [
        {
          ...sampleStructuredResume().experience[0],
          bullets: ['Built APIs with Node.js'],
        },
      ],
    })
    const uploaded = sampleStructuredResume({
      experience: [
        {
          ...sampleStructuredResume().experience[0],
          bullets: ['Built APIs with Node.js', 'Led migration to TypeScript'],
        },
      ],
    })

    const merged = mergeUploadedResumeEvidence(profileResume, uploaded, 'profile')
    expect(merged.experience[0].bullets).toContain('Led migration to TypeScript')
  })

  it('does not merge when master already comes from resume upload', () => {
    const structured = sampleStructuredResume({ summary: 'From upload' })
    const merged = mergeUploadedResumeEvidence(structured, sampleStructuredResume(), 'resume')
    expect(merged.summary).toBe('From upload')
    expect(merged.experience[0].bullets).toHaveLength(1)
  })
})

describe('formatSupplementaryProfileContext', () => {
  it('includes additional notes, achievements, and prior Q&A', () => {
    const data = emptyProfileData()
    data.personal.headline = 'Full-stack builder'
    data.additional = 'Also built internal tooling at Acme.'
    data.achievements = [{ id: 'a1', title: 'Hackathon winner', issuer: 'DevFest', date: '2024', description: 'Realtime app' }]
    data.applyAnswers!.saved = [
      {
        key: 'why-role',
        question: 'Why are you interested in backend work?',
        answer: 'I enjoy designing reliable APIs.',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]

    const text = formatSupplementaryProfileContext(data, {
      priorEnhancements: [{ question: 'Have you used Kafka?', answer: 'Yes — at Acme for event streaming.' }],
    })

    expect(text).toContain('Headline: Full-stack builder')
    expect(text).toContain('Additional notes')
    expect(text).toContain('Hackathon winner')
    expect(text).toContain('Why are you interested in backend work?')
    expect(text).toContain('Have you used Kafka?')
  })

  it('filters sensitive saved application answers', () => {
    const data = emptyProfileData()
    data.applyAnswers!.saved = [
      {
        key: 'race',
        question: 'What is your race?',
        answer: 'Prefer not to say',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        key: 'stack',
        question: 'Favorite stack?',
        answer: 'TypeScript and Postgres',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]

    const text = formatSupplementaryProfileContext(data)
    expect(text).not.toContain('What is your race?')
    expect(text).toContain('Favorite stack?')
  })
})

describe('buildTailorPromptContext', () => {
  it('returns markdown plus supplementary profile context', () => {
    const profileData = emptyProfileData()
    profileData.summary = 'Profile summary'
    profileData.experience = sampleStructuredResume().experience
    profileData.additional = 'Mentored interns.'

    const master: MasterResumeContext = {
      structured: sampleStructuredResume({ summary: 'Profile summary' }),
      source: 'profile',
      baseResumeId: 'resume-1',
      profileData,
      uploadedResume: sampleStructuredResume({
        experience: [
          {
            ...sampleStructuredResume().experience[0],
            bullets: ['Built APIs with Node.js', 'Owned CI/CD pipeline'],
          },
        ],
      }),
    }

    const { resumeMarkdown, profileContext } = buildTailorPromptContext({ master })
    expect(resumeMarkdown).toContain('## Experience')
    expect(resumeMarkdown).toContain('Owned CI/CD pipeline')
    expect(profileContext).toContain('Mentored interns.')
  })
})
