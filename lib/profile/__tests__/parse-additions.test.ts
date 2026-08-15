import { describe, expect, it } from 'vitest'
import { emptyProfileData } from '@/lib/profile/data'
import { applyParseAdditions, parseAdditions } from '@/lib/profile/parse-additions'
import { sampleStructuredResume } from './fixtures'

describe('parseAdditions', () => {
  it('returns roles and skills that are not already on the master', () => {
    const profile = emptyProfileData()
    profile.experience = sampleStructuredResume().experience
    profile.skills.technical = ['TypeScript']

    const parsed = sampleStructuredResume({
      experience: [
        ...sampleStructuredResume().experience,
        {
          id: 'exp-irc',
          company: 'IRC',
          title: 'Caseworker',
          location: '',
          startDate: '2018-01',
          endDate: '2019-01',
          current: false,
          bullets: ['Supported resettlement cases'],
          skills_used: [],
        },
      ],
      skills: { technical: ['TypeScript', 'Python'], soft: [], tools: [], languages: [] },
      projects: [
        {
          id: 'proj-1',
          name: 'NEMT Billing',
          description: '',
          bullets: ['Invoicing'],
          technologies: [],
          url: '',
          github: '',
        },
      ],
    })

    const additions = parseAdditions(parsed, profile)
    expect(additions.experience.map(e => e.company)).toEqual(['IRC'])
    expect(additions.projects.map(p => p.name)).toEqual(['NEMT Billing'])
    expect(additions.skills).toEqual(['Python'])

    const next = applyParseAdditions(profile, additions)
    expect(next.experience[0].company).toBe('IRC')
    expect(next.experience[1].company).toBe('Acme Corp')
  })
})
