import { describe, expect, it } from 'vitest'
import {
  dedupeResumeSkills,
  formatDegreeField,
  formatEducationLine,
  polishStructuredForExport,
  skillCategoryLines,
} from '@/lib/export/format'
import type { StructuredResume } from '@/types'

describe('formatDegreeField', () => {
  it('joins degree and field once', () => {
    expect(formatDegreeField('B.S.', 'Computer Science')).toBe('B.S. in Computer Science')
  })

  it('does not double-append when degree already has the field', () => {
    expect(formatDegreeField('B.S. in Computer Science', 'Computer Science')).toBe(
      'B.S. in Computer Science'
    )
  })

  it('keeps degree that already says in …', () => {
    expect(formatDegreeField('B.S. in Computer Science', 'CS')).toBe('B.S. in Computer Science')
  })
})

describe('dedupeResumeSkills', () => {
  it('removes case-insensitive duplicates across buckets', () => {
    const skills = dedupeResumeSkills({
      technical: ['TypeScript', 'React'],
      tools: ['Git', 'typescript'],
      languages: ['JavaScript', 'TypeScript'],
      soft: ['Communication'],
    })
    expect(skills.languages).toEqual(['JavaScript', 'TypeScript'])
    expect(skills.technical).toEqual(['React'])
    expect(skills.tools).toEqual(['Git'])
  })
})

describe('skillCategoryLines', () => {
  it('renders Claude-style category rows', () => {
    const lines = skillCategoryLines({
      languages: ['TypeScript', 'SQL'],
      technical: ['React', 'Next.js'],
      tools: ['AWS', 'PostgreSQL'],
      soft: [],
    })
    expect(lines.map(l => l.label)).toEqual(['Languages', 'Frameworks & Tools', 'Cloud & Data'])
  })
})

describe('polishStructuredForExport', () => {
  it('fixes education double-in and skill dupes', () => {
    const raw = {
      contact: { name: 'A', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '', website: '' },
      summary: '',
      experience: [],
      education: [
        {
          id: 'e1',
          institution: 'HSU',
          degree: 'B.S. in Computer Science',
          field: 'Computer Science',
          startDate: '2022',
          endDate: '2025',
          gpa: '3.0',
          relevant_courses: [],
          honors: [],
        },
      ],
      skills: {
        technical: ['JS', 'TypeScript'],
        tools: [],
        languages: ['TypeScript', 'JavaScript'],
        soft: [],
      },
      projects: [],
      certifications: [],
      volunteer: [],
      awards: [],
    } as StructuredResume
    const polished = polishStructuredForExport(raw)
    expect(formatEducationLine(polished.education[0])).toBe('B.S. in Computer Science')
    expect(polished.education[0].field).toBe('')
    const flat = [
      ...polished.skills.languages,
      ...polished.skills.technical,
      ...polished.skills.tools,
    ].map(s => s.toLowerCase())
    expect(new Set(flat).size).toBe(flat.length)
  })
})
