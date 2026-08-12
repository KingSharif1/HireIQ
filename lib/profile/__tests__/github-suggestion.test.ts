import { describe, expect, it } from 'vitest'
import { acceptSuggestion, normalizeProfileData } from '@/lib/profile/provenance'
import { emptyProfileData } from '@/lib/profile/data'

describe('acceptSuggestion github newProject', () => {
  it('creates a project from github suggestion', () => {
    const data = emptyProfileData()
    const withPending = {
      ...data,
      pendingSuggestions: [
        {
          id: 'gh-1',
          section: 'projects' as const,
          proposedText: 'desc',
          reason: 'new repo',
          sourceTailoredResumeId: 'github-sync',
          jobLabel: 'GitHub sync',
          createdAt: new Date().toISOString(),
          source: 'github' as const,
          newProject: {
            name: 'hireiq',
            description: 'AI tailor',
            github: 'https://github.com/dev/hireiq',
            technologies: ['TypeScript'],
            bullets: ['Built HireIQ'],
          },
        },
      ],
    }

    const next = acceptSuggestion(normalizeProfileData(withPending), 'gh-1')
    expect(next.projects).toHaveLength(1)
    expect(next.projects[0].name).toBe('hireiq')
    expect(next.projects[0].github).toContain('github.com')
    expect(next.pendingSuggestions).toHaveLength(0)
  })
})
