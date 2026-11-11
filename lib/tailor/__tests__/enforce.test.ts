import { describe, it, expect } from 'vitest'
import { enforceBlueprint } from '@/lib/tailor/enforce'
import { defaultBlueprint } from '@/lib/profile/blueprint'
import { structuredResumeToMarkdown, markdownToStructuredResume } from '@/lib/resume/markdown'
import type { ResumeBlueprint, StructuredResume } from '@/types'

function resume(overrides: Partial<StructuredResume> = {}): StructuredResume {
  return {
    contact: { name: 'A', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '', website: '' },
    summary: 'Summary',
    experience: [],
    education: [],
    skills: { technical: [], soft: [], tools: [], languages: [] },
    projects: [],
    certifications: [],
    volunteer: [],
    awards: [],
    ...overrides,
  }
}

function bp(overrides: Partial<ResumeBlueprint> = {}): ResumeBlueprint {
  return { ...defaultBlueprint(), ...overrides }
}

describe('enforceBlueprint', () => {
  it('re-inserts a dropped verbatim entry', () => {
    const original = resume({
      experience: [
        { id: 'exp1', company: 'Co', title: 'Dev', location: '', startDate: '2020', endDate: '2024', current: false, bullets: ['Built X'], skills_used: [] },
      ],
    })
    const draft = resume({ experience: [] })
    const { resume: out, violations } = enforceBlueprint(
      original,
      draft,
      bp({ rules: { exp1: 'verbatim' } }),
    )
    expect(out.experience.map((e) => e.id)).toEqual(['exp1'])
    expect(violations).toContainEqual({ kind: 'reinserted_entry', section: 'experience', entryId: 'exp1' })
  })

  it('restores a changed verbatim bullet', () => {
    const original = resume({
      experience: [
        { id: 'exp1', company: 'Co', title: 'Dev', location: '', startDate: '2020', endDate: '2024', current: false, bullets: ['Built X'], bulletIds: ['exp1:0'], skills_used: [] },
      ],
    })
    const draft = resume({
      experience: [
        { id: 'exp1', company: 'Co', title: 'Dev', location: '', startDate: '2020', endDate: '2024', current: false, bullets: ['Architected X'], bulletIds: ['exp1:0'], skills_used: [] },
      ],
    })
    const { resume: out, violations } = enforceBlueprint(
      original,
      draft,
      bp({ rules: { 'exp1:0': 'verbatim' } }),
    )
    expect(out.experience[0].bullets).toEqual(['Built X'])
    expect(violations).toContainEqual({ kind: 'restored_verbatim', section: 'experience', entryId: 'exp1', bulletId: 'exp1:0' })
  })

  it('re-inserts a dropped tailored bullet but keeps a reworded one', () => {
    const original = resume({
      experience: [
        {
          id: 'exp1', company: 'Co', title: 'Dev', location: '', startDate: '2020', endDate: '2024', current: false,
          bullets: ['Built X', 'Led Y'], bulletIds: ['exp1:0', 'exp1:1'], skills_used: [],
        },
      ],
    })
    // "Built X" dropped entirely; "Led Y" reworded (id preserved).
    const draft = resume({
      experience: [
        {
          id: 'exp1', company: 'Co', title: 'Dev', location: '', startDate: '2020', endDate: '2024', current: false,
          bullets: ['Led the Y effort'], bulletIds: ['exp1:1'], skills_used: [],
        },
      ],
    })
    const { resume: out, violations } = enforceBlueprint(
      original,
      draft,
      bp({ rules: { 'exp1:0': 'tailored', 'exp1:1': 'tailored' } }),
    )
    expect(out.experience[0].bullets).toEqual(['Led the Y effort', 'Built X'])
    expect(violations).toContainEqual({ kind: 'reinserted_bullet', section: 'experience', entryId: 'exp1', bulletId: 'exp1:0' })
    // The reworded bullet must NOT be flagged as reinserted.
    expect(violations.filter((v) => v.bulletId === 'exp1:1')).toEqual([])
  })

  it('strips a hidden bullet the model re-added', () => {
    const original = resume({
      experience: [
        { id: 'exp1', company: 'Co', title: 'Dev', location: '', startDate: '2020', endDate: '2024', current: false, bullets: ['Keep', 'Drop'], bulletIds: ['exp1:0', 'exp1:1'], skills_used: [] },
      ],
    })
    const draft = resume({
      experience: [
        { id: 'exp1', company: 'Co', title: 'Dev', location: '', startDate: '2020', endDate: '2024', current: false, bullets: ['Keep', 'Drop'], bulletIds: ['exp1:0', 'exp1:1'], skills_used: [] },
      ],
    })
    const { resume: out, violations } = enforceBlueprint(
      original,
      draft,
      bp({ hidden: ['exp1:1'] }),
    )
    expect(out.experience[0].bullets).toEqual(['Keep'])
    expect(violations).toContainEqual({ kind: 'removed_hidden', section: 'experience', entryId: 'exp1', bulletId: 'exp1:1' })
  })

  it('re-inserts everything when aiChooses is false', () => {
    const original = resume({
      experience: [
        { id: 'exp1', company: 'Co', title: 'Dev', location: '', startDate: '2020', endDate: '2024', current: false, bullets: ['Built X'], skills_used: [] },
      ],
    })
    const draft = resume({ experience: [] })
    const { resume: out } = enforceBlueprint(original, draft, bp({ aiChooses: false }))
    expect(out.experience.map((e) => e.id)).toEqual(['exp1'])
  })
})

describe('markdown round-trip bullet ids', () => {
  it('preserves unique bullet ids through serialize → parse', () => {
    const r = resume({
      experience: [
        { id: 'exp1', company: 'Co', title: 'Dev', location: '', startDate: '2020', endDate: '2024', current: false, bullets: ['Built X', 'Led Y'], skills_used: [] },
      ],
      projects: [
        { id: 'proj1', name: 'P', description: '', bullets: ['Shipped'], technologies: [], url: '', github: '' },
      ],
    })
    const md = structuredResumeToMarkdown(r)
    const parsed = markdownToStructuredResume(md)
    expect(parsed.experience[0].bulletIds).toEqual(['exp1:0', 'exp1:1'])
    expect(parsed.experience[0].bullets).toEqual(['Built X', 'Led Y'])
    expect(parsed.projects[0].bulletIds).toEqual(['proj1:0'])
    expect(parsed.projects[0].bullets).toEqual(['Shipped'])
  })
})
