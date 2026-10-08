import { describe, expect, it } from 'vitest'
import {
  dedupeResumeSkills,
  formatDateRange,
  formatDegreeField,
  formatEducationLine,
  polishStructuredForExport,
  skillCategoryLines,
  stripMarkdownInline,
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

describe('formatDateRange', () => {
  it('joins start and end with an en dash', () => {
    expect(formatDateRange('09/2022', '10/2023')).toBe('09/2022 – 10/2023')
  })

  it('omits the dangling separator when the end date is empty', () => {
    expect(formatDateRange('2025', '')).toBe('2025')
  })

  it('drops a separator-only end date instead of rendering a dangling dash', () => {
    expect(formatDateRange('2021', '–')).toBe('2021')
    expect(formatDateRange('2021', '—')).toBe('2021')
    expect(formatDateRange('May 2021 –', '')).toBe('May 2021')
  })

  it('omits the dangling separator when the start date is empty', () => {
    expect(formatDateRange('', '2025')).toBe('2025')
  })

  it('returns empty string when both are empty', () => {
    expect(formatDateRange('', '')).toBe('')
  })
})

describe('stripMarkdownInline', () => {
  it('strips **bold** markers', () => {
    expect(stripMarkdownInline('**Process Optimization:** Streamlined workflows')).toBe(
      'Process Optimization: Streamlined workflows',
    )
  })

  it('strips __ and backtick markers', () => {
    expect(stripMarkdownInline('__Lead__ the `deploy` step')).toBe('Lead the deploy step')
  })

  it('leaves plain text untouched', () => {
    expect(stripMarkdownInline('Streamlined technical workflows by 20%')).toBe(
      'Streamlined technical workflows by 20%',
    )
  })

  it('strips an unclosed ** marker', () => {
    expect(stripMarkdownInline('**Led the billing migration')).toBe('Led the billing migration')
  })
})

describe('education polish', () => {
  it('does not append a dash-only field or date', () => {
    expect(formatDegreeField('B.S.', '–')).toBe('B.S.')
    expect(formatEducationLine({ degree: 'B.S. Computer Science –', field: '' })).toBe(
      'B.S. Computer Science',
    )
  })
})
