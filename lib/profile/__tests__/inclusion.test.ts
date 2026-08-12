import { describe, expect, it } from 'vitest'
import { applyInclusion, isIncluded, toggleInclusionId } from '@/lib/profile/inclusion'
import { emptyProfileData } from '@/lib/profile/data'
import type { ResumeInclusion } from '@/types'

function sampleProfileData() {
  const data = emptyProfileData()
  data.personal = {
    ...data.personal,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    headline: 'Engineer',
  }
  data.summary = 'Built the Analytical Engine.'
  data.experience = [
    {
      id: 'exp-1',
      company: 'Babbage Co',
      title: 'Analyst',
      location: 'London',
      startDate: '1840',
      endDate: '1843',
      current: false,
      bullets: ['Designed algorithms', 'Wrote notes'],
      bulletIds: ['b1', 'b2'],
      skills_used: [],
    },
    {
      id: 'exp-2',
      company: 'Other',
      title: 'Intern',
      location: '',
      startDate: '1839',
      endDate: '1840',
      current: false,
      bullets: ['Helped'],
      bulletIds: ['b3'],
      skills_used: [],
    },
  ]
  data.education = [
    {
      id: 'edu-1',
      institution: 'Home',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      gpa: '',
      relevant_courses: [],
      honors: [],
    },
  ]
  data.projects = [
    {
      id: 'proj-1',
      name: 'Engine',
      description: '',
      bullets: ['Prototype'],
      bulletIds: ['pb1'],
      technologies: [],
      url: '',
      github: '',
    },
  ]
  data.skills = {
    technical: ['Math', 'Logic'],
    soft: [],
    tools: ['Pencil'],
    languages: [],
  }
  return data
}

describe('applyInclusion', () => {
  it('returns full resume when inclusion is empty', () => {
    const resume = applyInclusion(sampleProfileData(), {})
    expect(resume.experience).toHaveLength(2)
    expect(resume.summary).toContain('Analytical')
    expect(resume.skills.technical).toEqual(['Math', 'Logic'])
  })

  it('filters experience and bullets', () => {
    const inclusion: ResumeInclusion = {
      experienceIds: ['exp-1'],
      bulletIds: ['b1'],
    }
    const resume = applyInclusion(sampleProfileData(), inclusion)
    expect(resume.experience).toHaveLength(1)
    expect(resume.experience[0].bullets).toEqual(['Designed algorithms'])
  })

  it('hides summary when section excluded', () => {
    const resume = applyInclusion(sampleProfileData(), { sectionIds: ['contact', 'title'] })
    expect(resume.summary).toBe('')
  })
})

describe('isIncluded / toggleInclusionId', () => {
  it('defaults to included when key absent', () => {
    expect(isIncluded({}, 'bullet', 'b1')).toBe(true)
    expect(isIncluded(null, 'experience', 'exp-1')).toBe(true)
  })

  it('toggles ids relative to full set', () => {
    const next = toggleInclusionId({}, 'bulletIds', 'b2', ['b1', 'b2', 'b3'], false)
    expect(next.bulletIds).toEqual(['b1', 'b3'])
    const back = toggleInclusionId(next, 'bulletIds', 'b2', ['b1', 'b2', 'b3'], true)
    expect(back.bulletIds?.sort()).toEqual(['b1', 'b2', 'b3'])
  })

  it('uses canonical case-insensitive skill ids', () => {
    const next = toggleInclusionId(
      { skillIds: ['JavaScript', 'PYTHON'] },
      'skillIds',
      'javascript',
      ['JavaScript', 'Python'],
      false
    )
    expect(next.skillIds).toEqual(['python'])
    expect(isIncluded(next, 'skill', 'Python')).toBe(true)
    expect(isIncluded(next, 'skill', 'JavaScript')).toBe(false)
  })
})
