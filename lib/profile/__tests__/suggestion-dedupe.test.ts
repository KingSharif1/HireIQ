import { describe, expect, it } from 'vitest'
import { emptyProfileData } from '@/lib/profile/data'
import { bulletsWithIds } from '@/lib/profile/bullets'
import {
  filterNovelSuggestions,
  profileHasSuggestionContent,
  retargetSuggestionIfMismatch,
} from '@/lib/profile/suggestion-dedupe'
import { acceptSuggestion, writeBackToPending } from '@/lib/profile/provenance'
import type { PendingSuggestion } from '@/types'

function profileWithHarperAndAcme() {
  const data = emptyProfileData()
  const harper = bulletsWithIds(
    ['Shipped customer deploy tooling for brokers at Harper.'],
    undefined,
    'bul'
  )
  const acme = bulletsWithIds(['Built APIs'], undefined, 'bul')
  data.experience = [
    {
      id: 'exp-harper',
      company: 'Harper',
      title: 'Forward Deployed Engineer',
      location: '',
      startDate: '2024',
      endDate: '',
      current: true,
      bullets: harper.bullets,
      bulletIds: harper.bulletIds,
      skills_used: [],
    },
    {
      id: 'exp-acme',
      company: 'Acme',
      title: 'Engineer',
      location: '',
      startDate: '2020',
      endDate: '',
      current: false,
      bullets: acme.bullets,
      bulletIds: acme.bulletIds,
      skills_used: [],
    },
  ]
  data.skills.technical = ['TypeScript', 'React']
  return data
}

describe('suggestion-dedupe', () => {
  it('detects an existing bullet as already present', () => {
    const data = profileWithHarperAndAcme()
    const suggestion: PendingSuggestion = {
      id: 's1',
      section: 'experience',
      targetEntryId: 'exp-harper',
      proposedText: 'Shipped customer deploy tooling for brokers at Harper.',
      reason: 'dup',
      sourceTailoredResumeId: 't1',
      jobLabel: 'FDE @ Harper',
      createdAt: new Date().toISOString(),
    }
    expect(profileHasSuggestionContent(data, suggestion)).toBe(true)
  })

  it('detects existing skills case-insensitively', () => {
    const data = profileWithHarperAndAcme()
    expect(
      profileHasSuggestionContent(data, {
        id: 'sk',
        section: 'skills',
        proposedText: 'typescript',
        reason: 'dup',
        sourceTailoredResumeId: 't1',
        jobLabel: 'Job',
        createdAt: new Date().toISOString(),
      })
    ).toBe(true)
  })

  it('retargets Harper text away from the wrong role', () => {
    const data = profileWithHarperAndAcme()
    const suggestion: PendingSuggestion = {
      id: 's-wrong',
      section: 'experience',
      targetEntryId: 'exp-acme',
      proposedText: 'Led on-site deployments as Forward Deployed Engineer at Harper.',
      reason: 'misrouted',
      sourceTailoredResumeId: 't1',
      jobLabel: 'FDE @ Harper',
      createdAt: new Date().toISOString(),
    }
    const fixed = retargetSuggestionIfMismatch(data, suggestion)
    expect(fixed.targetEntryId).toBe('exp-harper')
  })

  it('filters novel write-backs so duplicates never enter pending', () => {
    const data = profileWithHarperAndAcme()
    const items = writeBackToPending(
      [
        {
          id: 'wb1',
          section: 'experience',
          targetEntryId: 'exp-harper',
          proposedText: 'Shipped customer deploy tooling for brokers at Harper.',
          reason: 'already there',
        },
        {
          id: 'wb2',
          section: 'experience',
          targetEntryId: 'exp-acme',
          proposedText: 'Owned the Acme billing cutover across three services.',
          reason: 'new',
        },
      ],
      'tailor-1',
      'FDE @ Harper',
      undefined,
      data
    )
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('wb2')
  })

  it('accepting a duplicate clears pending without appending', () => {
    const data = profileWithHarperAndAcme()
    const suggestion: PendingSuggestion = {
      id: 's-dup',
      section: 'experience',
      targetEntryId: 'exp-harper',
      proposedText: 'Shipped customer deploy tooling for brokers at Harper.',
      reason: 'dup',
      sourceTailoredResumeId: 't1',
      jobLabel: 'FDE @ Harper',
      createdAt: new Date().toISOString(),
    }
    const next = acceptSuggestion({ ...data, pendingSuggestions: [suggestion] }, 's-dup')
    expect(next.pendingSuggestions).toHaveLength(0)
    expect(next.experience.find(e => e.id === 'exp-harper')?.bullets).toHaveLength(1)
  })

  it('accepting a misrouted Harper bullet lands on Harper, not Acme', () => {
    const data = profileWithHarperAndAcme()
    const suggestion: PendingSuggestion = {
      id: 's-mis',
      section: 'experience',
      targetEntryId: 'exp-acme',
      proposedText: 'Ran customer workshops for brokers at Harper.',
      reason: 'misrouted',
      sourceTailoredResumeId: 't1',
      jobLabel: 'FDE @ Harper',
      createdAt: new Date().toISOString(),
    }
    const next = acceptSuggestion({ ...data, pendingSuggestions: [suggestion] }, 's-mis')
    const harper = next.experience.find(e => e.id === 'exp-harper')
    const acme = next.experience.find(e => e.id === 'exp-acme')
    expect(harper?.bullets.some(b => b.includes('customer workshops'))).toBe(true)
    expect(acme?.bullets).toHaveLength(1)
  })

  it('drops near-duplicate incoming suggestions against pending', () => {
    const data = profileWithHarperAndAcme()
    data.pendingSuggestions = [
      {
        id: 'pending-1',
        section: 'experience',
        targetEntryId: 'exp-acme',
        proposedText: 'Owned the Acme billing cutover across three services.',
        reason: 'already pending',
        sourceTailoredResumeId: 't1',
        jobLabel: 'Acme',
        createdAt: new Date().toISOString(),
      },
    ]
    const filtered = filterNovelSuggestions(data, [
      {
        id: 'incoming-1',
        section: 'experience',
        targetEntryId: 'exp-acme',
        proposedText: 'Owned the Acme billing cutover across three services.',
        reason: 'dup pending',
        sourceTailoredResumeId: 't2',
        jobLabel: 'Acme',
        createdAt: new Date().toISOString(),
      },
    ])
    expect(filtered).toHaveLength(0)
  })
})
