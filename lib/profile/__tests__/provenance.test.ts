import { describe, expect, it } from 'vitest'
import {
  acceptSuggestion,
  addGitHubProjectHighlight,
  declineSuggestion,
  getProvenanceLabel,
  isGitHubToolSuggestion,
  mergePendingSuggestions,
  normalizeProfileData,
  recordBulletEdit,
  writeBackToPending,
} from '@/lib/profile/provenance'
import { isHeavyEdit } from '@/lib/profile/bullets'
import { emptyProfileData } from '@/lib/profile/data'
import { bulletsWithIds } from '@/lib/profile/bullets'
import { profileDataWithSummary, sampleStructuredResume } from '@/lib/profile/__tests__/fixtures'
import { acceptedSuggestionFocus } from '@/lib/profile/suggestion-focus'

function profileWithExperience() {
  const data = profileDataWithSummary('Summary')
  const { bullets, bulletIds } = bulletsWithIds(['Built APIs'], undefined, 'bul')
  data.experience = [
    {
      id: 'exp-1',
      company: 'Acme',
      title: 'Engineer',
      location: 'Remote',
      startDate: '2020',
      endDate: '',
      current: true,
      bullets,
      bulletIds,
      skills_used: [],
    },
  ]
  return data
}

describe('acceptSuggestion', () => {
  it('adds bullet to experience with tailor provenance', () => {
    const data = profileWithExperience()
    const suggestion = {
      id: 's1',
      section: 'experience' as const,
      targetEntryId: 'exp-1',
      proposedText: 'Led migration to Kubernetes across 3 services.',
      reason: 'From your gap answer',
      sourceTailoredResumeId: 'tailor-1',
      jobLabel: 'Platform @ Acme',
      createdAt: new Date().toISOString(),
    }
    const next = acceptSuggestion({ ...data, pendingSuggestions: [suggestion] }, 's1')

    expect(next.pendingSuggestions).toHaveLength(0)
    expect(next.experience[0].bullets).toHaveLength(2)
    const newBulletId = next.experience[0].bulletIds![1]
    expect(acceptedSuggestionFocus(data, next, suggestion)).toEqual({
      section: 'experience',
      entryId: 'exp-1',
      bulletId: newBulletId,
    })
    expect(next.provenance?.[newBulletId]?.origin).toBe('tailor')
    expect(next.provenance?.[newBulletId]?.history.length).toBeGreaterThanOrEqual(2)
  })

  it('does not dump an untargeted Q&A bullet onto the first job', () => {
    const data = profileWithExperience()
    const suggestion = {
      id: 's-irc',
      section: 'experience' as const,
      proposedText: 'Supported resettlement operations at IRC.',
      reason: 'New role',
      sourceTailoredResumeId: 'tailor-1',
      jobLabel: 'FDE @ Harper',
      createdAt: new Date().toISOString(),
      newExperience: { company: 'IRC' },
    }
    const next = acceptSuggestion({ ...data, pendingSuggestions: [suggestion] }, 's-irc')
    expect(next.experience[0].company).toBe('IRC')
    expect(next.experience[0].bullets[0]).toContain('IRC')
    expect(next.experience[1].company).toBe('Acme')
    expect(next.experience[1].bullets).toHaveLength(1)
    expect(acceptedSuggestionFocus(data, next, suggestion)).toEqual({
      section: 'experience',
      entryId: next.experience[0].id,
      bulletId: next.experience[0].bulletIds![0],
    })
  })
})

describe('declineSuggestion', () => {
  it('removes pending without changing experience', () => {
    const data = profileWithExperience()
    const pending = [{
      id: 's1',
      section: 'experience' as const,
      proposedText: 'x',
      reason: 'y',
      sourceTailoredResumeId: 't1',
      jobLabel: 'Job',
      createdAt: new Date().toISOString(),
    }]
    const next = declineSuggestion({ ...data, pendingSuggestions: pending }, 's1')
    expect(next.pendingSuggestions).toHaveLength(0)
    expect(next.experience[0].bullets).toHaveLength(1)
  })

  it('persists dismissed ids so GitHub re-sync cannot re-offer them', () => {
    const data = profileWithExperience()
    const pending = [{
      id: 'gh-1-bullet',
      section: 'projects' as const,
      targetEntryId: 'p1',
      proposedText: 'Shipped with Next.js',
      reason: 'from github',
      sourceTailoredResumeId: 'github-sync',
      jobLabel: 'GitHub sync',
      createdAt: new Date().toISOString(),
      source: 'github' as const,
    }]
    const next = declineSuggestion(
      { ...data, pendingSuggestions: pending, dismissedSuggestionIds: [] },
      'gh-1-bullet'
    )
    expect(next.pendingSuggestions).toHaveLength(0)
    expect(next.dismissedSuggestionIds).toContain('gh-1-bullet')
  })
})

describe('recordBulletEdit', () => {
  it('keeps tailor origin on small edits', () => {
    const bulletId = 'bul-1'
    const data = profileWithExperience()
    data.provenance = {
      [bulletId]: {
        origin: 'tailor',
        sourceTailoredResumeId: 't1',
        jobLabel: 'Job',
        history: [{ type: 'accepted', date: '2026-01-01' }],
      },
    }
    const next = recordBulletEdit(data, bulletId, 'Built APIs', 'Built REST APIs')
    expect(next.provenance?.[bulletId]?.origin).toBe('tailor')
    expect(next.provenance?.[bulletId]?.history).toHaveLength(2)
  })

  it('converts to base on heavy edit but keeps history', () => {
    const bulletId = 'bul-1'
    const data = profileWithExperience()
    data.provenance = {
      [bulletId]: {
        origin: 'tailor',
        history: [{ type: 'added_from_tailor', date: '2026-01-01' }],
      },
    }
    const before = 'Built internal tools'
    const after = 'Architected enterprise data platform serving 2M users with 99.9% uptime'
    expect(isHeavyEdit(before, after)).toBe(true)
    const next = recordBulletEdit(data, bulletId, before, after)
    expect(next.provenance?.[bulletId]?.origin).toBe('base')
    expect(next.provenance?.[bulletId]?.history.some(h => h.type === 'added_from_tailor')).toBe(true)
    expect(getProvenanceLabel(next.provenance?.[bulletId])).toMatch(/^You · edited /)
  })
})

describe('mergePendingSuggestions', () => {
  it('dedupes by id and keeps first by default', () => {
    const a = [{ id: '1', section: 'experience' as const, proposedText: 'a', reason: '', sourceTailoredResumeId: '', jobLabel: '', createdAt: '' }]
    const b = [{ id: '1', section: 'experience' as const, proposedText: 'b', reason: '', sourceTailoredResumeId: '', jobLabel: '', createdAt: '' }]
    expect(mergePendingSuggestions(a, b)[0].proposedText).toBe('a')
  })

  it('can prefer incoming when refreshing', () => {
    const a = [{ id: '1', section: 'experience' as const, proposedText: 'a', reason: '', sourceTailoredResumeId: '', jobLabel: '', createdAt: '' }]
    const b = [{ id: '1', section: 'experience' as const, proposedText: 'b', reason: '', sourceTailoredResumeId: '', jobLabel: '', createdAt: '' }]
    expect(mergePendingSuggestions(a, b, { preferIncoming: true })[0].proposedText).toBe('b')
  })
})

describe('writeBackToPending', () => {
  it('maps tailor write-backs to pending shape', () => {
    const items = writeBackToPending(
      [{ id: 'wb-1', section: 'experience', proposedText: 'Long enough answer here for profile.', reason: 'why', sourceQuestionId: 'q1' }],
      'tailor-99',
      'SE @ Co',
      'exp-1'
    )
    expect(items[0].sourceTailoredResumeId).toBe('tailor-99')
    expect(items[0].targetEntryId).toBe('exp-1')
  })
})

describe('normalizeProfileData', () => {
  it('ensures bulletIds on experience entries', () => {
    const raw = emptyProfileData()
    raw.experience = [sampleStructuredResume().experience[0]]
    const norm = normalizeProfileData(raw)
    expect(norm.experience[0].bulletIds?.length).toBe(norm.experience[0].bullets.length)
  })

  it('does not crash on sparse/empty profile blobs (new accounts)', () => {
    const norm = normalizeProfileData({} as ReturnType<typeof emptyProfileData>)
    expect(norm.experience).toEqual([])
    expect(norm.projects).toEqual([])
    expect(norm.urls).toEqual([])
    expect(normalizeProfileData(null as unknown as ReturnType<typeof emptyProfileData>).skills.technical).toEqual([])
  })

  it('normalizes dismissedSuggestionIds', () => {
    const norm = normalizeProfileData({
      ...emptyProfileData(),
      dismissedSuggestionIds: ['gh-1', 'gh-1', ''] as string[],
    })
    expect(norm.dismissedSuggestionIds).toEqual(['gh-1'])
  })
})

describe('acceptSuggestion GitHub tool tags', () => {
  it('adds tool suggestions onto project technologies, not as bullets', () => {
    const data = emptyProfileData()
    data.projects = [
      {
        id: 'p1',
        name: 'HireIQ',
        description: '',
        bullets: ['Built app'],
        technologies: ['React'],
        url: '',
        github: 'https://github.com/dev/hireiq',
      },
    ]
    const suggestion = {
      id: 'gh-1-tool-next-js',
      section: 'projects' as const,
      targetEntryId: 'p1',
      proposedText: 'Next.js',
      reason: 'Add Next.js',
      sourceTailoredResumeId: 'github-sync',
      jobLabel: 'GitHub sync',
      createdAt: new Date().toISOString(),
      source: 'github' as const,
    }
    expect(isGitHubToolSuggestion(suggestion)).toBe(true)
    const next = acceptSuggestion({ ...data, pendingSuggestions: [suggestion] }, 'gh-1-tool-next-js')
    expect(next.projects[0].technologies).toContain('Next.js')
    expect(next.projects[0].bullets).toEqual(['Built app'])
    expect(next.pendingSuggestions).toHaveLength(0)
  })
})

describe('addGitHubProjectHighlight', () => {
  it('adds a bullet, technologies, and GitHub provenance together', () => {
    const data = emptyProfileData()
    data.projects = [
      {
        id: 'project-1',
        name: 'HireIQ',
        description: '',
        bullets: [],
        bulletIds: [],
        technologies: ['Next.js'],
        url: '',
        github: 'https://github.com/dev/hireiq',
      },
    ]

    const next = addGitHubProjectHighlight(
      data,
      'project-1',
      'Implemented evidence-backed repository analysis using selected source files and commit-aware caching.',
      'dev/hireiq@abc1234',
      ['Next.js', 'Supabase']
    )

    expect(next.projects[0]?.bullets).toHaveLength(1)
    expect(next.projects[0]?.technologies).toEqual(['Next.js', 'Supabase'])
    const bulletId = next.projects[0]?.bulletIds?.[0]
    expect(next.provenance?.[bulletId ?? '']?.origin).toBe('github')
    expect(next.provenance?.[bulletId ?? '']?.jobLabel).toContain('abc1234')
  })
})
