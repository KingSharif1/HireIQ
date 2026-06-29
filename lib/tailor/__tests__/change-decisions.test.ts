import { describe, it, expect } from 'vitest'
import {
  buildApprovedResume,
  countPendingDecisions,
  getChangeId,
  initialDecisions,
  setAllDecisions,
  withChangeIds,
} from '@/lib/tailor/change-decisions'
import type { ResumeDiffChange, StructuredResume } from '@/types'

const original: StructuredResume = {
  contact: { name: 'A', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '', website: '' },
  summary: 'Original summary',
  experience: [{
    id: 'exp1', company: 'Co', title: 'Dev', location: '', startDate: '2020', endDate: '2024',
    current: false, bullets: ['Built APIs'], skills_used: [],
  }],
  education: [],
  skills: { technical: ['JS'], soft: [], tools: ['Git'], languages: [] },
  projects: [],
  certifications: [],
  volunteer: [],
  awards: [],
}

const tailored: StructuredResume = {
  ...structuredClone(original),
  summary: 'Tailored summary for role',
  experience: [{
    ...original.experience[0],
    bullets: ['Built REST APIs at scale', 'Led migrations'],
  }],
}

const changes: ResumeDiffChange[] = [
  {
    id: 'summary:text::0',
    section: 'summary',
    field: 'text',
    before: 'Original summary',
    after: 'Tailored summary for role',
    changeType: 'changed',
    reason: 'Match JD keywords',
  },
  {
    id: 'experience:bullets:exp1::1',
    section: 'experience',
    field: 'bullets',
    expId: 'exp1',
    before: ['Built APIs'],
    after: ['Built REST APIs at scale', 'Led migrations'],
    changeType: 'changed',
  },
]

describe('change-decisions', () => {
  it('defaults empty decisions to all accepted (legacy)', () => {
    const approved = buildApprovedResume(original, tailored, changes, {})
    expect(approved.summary).toBe('Tailored summary for role')
    expect(approved.experience[0].bullets).toEqual(['Built REST APIs at scale', 'Led migrations'])
  })

  it('reverts declined summary change', () => {
    const decisions = { [changes[0].id!]: { status: 'declined' as const, declineReasonCode: 'prefer_original' as const } }
    const approved = buildApprovedResume(original, tailored, changes, decisions)
    expect(approved.summary).toBe('Original summary')
    expect(approved.experience[0].bullets).toEqual(['Built REST APIs at scale', 'Led migrations'])
  })

  it('applies edited bullet text', () => {
    const decisions = {
      [changes[1].id!]: {
        status: 'edited' as const,
        editedValue: ['Built REST APIs (edited)'],
      },
    }
    const approved = buildApprovedResume(original, tailored, changes, decisions)
    expect(approved.experience[0].bullets).toEqual(['Built REST APIs (edited)'])
  })

  it('counts pending and sets all', () => {
    const pending = initialDecisions(changes)
    expect(countPendingDecisions(changes, pending)).toBe(2)
    const accepted = setAllDecisions(changes, pending, 'accepted')
    expect(countPendingDecisions(changes, accepted)).toBe(0)
  })

  it('withChangeIds assigns stable ids', () => {
    const raw: ResumeDiffChange[] = [{ section: 'summary', field: 'text', before: 'a', after: 'b' }]
    const ids = withChangeIds(raw)
    expect(ids[0].id).toBe(getChangeId(raw[0], 0))
  })
})
