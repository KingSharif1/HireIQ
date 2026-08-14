import { describe, expect, it } from 'vitest'
import { mergeGitHubPendingSuggestions } from '@/lib/profile/provenance'
import { githubSuggestionsFromRepos } from '@/lib/github/suggestions'
import { emptyProfileData } from '@/lib/profile/data'
import type { GitHubRepoSnapshot } from '@/lib/github/types'

const repo = (): GitHubRepoSnapshot => ({
  id: 42,
  name: 'HireIQ',
  fullName: 'KingSharif1/HireIQ',
  htmlUrl: 'https://github.com/KingSharif1/HireIQ',
  description: 'AI job search workspace',
  languages: ['TypeScript'],
  stars: 0,
  pushedAt: new Date().toISOString(),
  status: 'active',
  topics: ['resume', 'ai'],
  isFork: false,
  isPrivate: false,
  readmeExcerpt:
    'HireIQ is an AI resume tailoring and job tracking workspace with GitHub sync, gap analysis, and hosted auto-apply.',
  rootPaths: ['app', 'components', 'lib'],
  tools: ['next', 'supabase'],
})

describe('mergeGitHubPendingSuggestions', () => {
  it('replaces stale github pending on re-sync', () => {
    const data = emptyProfileData()
    data.projects = [
      {
        id: 'p1',
        name: 'HireIQ',
        description: '',
        bullets: [],
        technologies: [],
        url: '',
        github: '',
      },
    ]

    const stale = {
      id: 'gh-42',
      section: 'projects' as const,
      targetEntryId: 'p1',
      proposedText: 'Open-source project — built with TypeScript (active on GitHub)',
      reason: 'old',
      sourceTailoredResumeId: 'github-sync',
      jobLabel: 'GitHub sync',
      createdAt: '2026-01-01',
      source: 'github' as const,
    }

    const tailorPending = {
      id: 'wb-1',
      section: 'experience' as const,
      proposedText: 'Led migration',
      reason: 'from tailor',
      sourceTailoredResumeId: 'tailor-1',
      jobLabel: 'Acme role',
      createdAt: '2026-02-01',
    }

    const fresh = githubSuggestionsFromRepos([repo()], data)
    const merged = mergeGitHubPendingSuggestions([stale, tailorPending], fresh)

    expect(merged).toHaveLength(2)
    expect(merged.find(s => s.id === 'wb-1')).toBeTruthy()
    const gh = merged.find(s => s.id === 'gh-42')
    expect(gh?.proposedText).not.toContain('Open-source project')
    expect(gh?.proposedText.toLowerCase()).toContain('hireiq')
  })
})
