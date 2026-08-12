import { describe, expect, it } from 'vitest'
import { canonicalSkillId, displaySkills, resumeSkillLabels } from '@/lib/profile/skills'

describe('resume skills', () => {
  it('deduplicates labels case-insensitively while preserving first spelling', () => {
    expect(
      resumeSkillLabels({
        technical: ['JavaScript', 'Python'],
        tools: [' javascript ', 'Docker'],
        languages: ['Python', 'English'],
        soft: [],
      })
    ).toEqual(['JavaScript', 'Python', 'Docker', 'English'])
  })

  it('creates stable canonical ids', () => {
    expect(canonicalSkillId(' TypeScript ')).toBe('typescript')
    expect(displaySkills({ technical: ['C++'], tools: [], languages: [], soft: [] })).toEqual([
      { id: 'c++', label: 'C++' },
    ])
  })
})
