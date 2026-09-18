import { describe, expect, it } from 'vitest'
import {
  enrichmentSuggestionsForLinkedRepo,
  githubSuggestionsFromRepos,
  ensureGitHubUrl,
} from '@/lib/github/suggestions'
import { emptyProfileData } from '@/lib/profile/data'
import type { GitHubRepoSnapshot } from '@/lib/github/types'

const baseRepo = (over: Partial<GitHubRepoSnapshot> = {}): GitHubRepoSnapshot => ({
  id: 1,
  name: 'hireiq',
  fullName: 'dev/hireiq',
  htmlUrl: 'https://github.com/dev/hireiq',
  description: 'AI resume tailor',
  languages: ['TypeScript', 'React'],
  stars: 12,
  pushedAt: new Date().toISOString(),
  status: 'active',
  topics: [],
  isFork: false,
  isPrivate: false,
  readmeExcerpt:
    'HireIQ is an AI resume tailoring platform with job gap analysis, GitHub sync, and hosted auto-apply for developers.',
  rootPaths: ['app', 'src', 'components'],
  tools: ['next', 'supabase'],
  ...over,
})

describe('githubSuggestionsFromRepos', () => {
  it('suggests new project for unmatched repo', () => {
    const data = emptyProfileData()
    const suggestions = githubSuggestionsFromRepos([baseRepo()], data)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].newProject?.name).toBe('hireiq')
    expect(suggestions[0].section).toBe('projects')
  })

  it('does not invent a new card for name-matched unlinked projects', () => {
    const data = emptyProfileData()
    data.projects = [
      {
        id: 'p1',
        name: 'HireIQ',
        description: '',
        bullets: ['Built app'],
        technologies: [],
        url: '',
        github: '',
      },
    ]
    const suggestions = githubSuggestionsFromRepos([baseRepo()], data)
    expect(suggestions).toHaveLength(0)
  })

  it('emits pending tool + bullet enrichments for linked repos (Option A)', () => {
    const data = emptyProfileData()
    data.projects = [
      {
        id: 'p1',
        name: 'HireIQ',
        description: '',
        bullets: ['Built the first prototype'],
        technologies: ['React'],
        url: '',
        github: 'https://github.com/dev/hireiq',
      },
    ]
    const suggestions = githubSuggestionsFromRepos([baseRepo()], data)
    expect(suggestions.some(s => s.id === 'gh-1-bullet')).toBe(true)
    expect(suggestions.some(s => s.id.startsWith('gh-1-tool-'))).toBe(true)
    expect(suggestions.every(s => s.targetEntryId === 'p1')).toBe(true)
    expect(suggestions.every(s => !s.newProject)).toBe(true)
  })

  it('skips enrichment ids the user dismissed forever', () => {
    const data = emptyProfileData()
    data.projects = [
      {
        id: 'p1',
        name: 'HireIQ',
        description: '',
        bullets: ['Built the first prototype'],
        technologies: [],
        url: '',
        github: 'https://github.com/dev/hireiq',
      },
    ]
    data.dismissedSuggestionIds = ['gh-1-bullet', 'gh-1-tool-next-js']
    const suggestions = githubSuggestionsFromRepos([baseRepo()], data)
    expect(suggestions.find(s => s.id === 'gh-1-bullet')).toBeUndefined()
    expect(suggestions.find(s => s.id === 'gh-1-tool-next-js')).toBeUndefined()
  })

  it('skips dismissed new-project ids on re-sync', () => {
    const data = emptyProfileData()
    data.dismissedSuggestionIds = ['gh-1']
    const suggestions = githubSuggestionsFromRepos([baseRepo()], data)
    expect(suggestions).toHaveLength(0)
  })

  it('skips archived unmatched repos', () => {
    const data = emptyProfileData()
    const suggestions = githubSuggestionsFromRepos([baseRepo({ status: 'archived' })], data)
    expect(suggestions).toHaveLength(0)
  })

  it('skips empty repos with no real signal', () => {
    const data = emptyProfileData()
    const suggestions = githubSuggestionsFromRepos(
      [
        baseRepo({
          id: 99,
          name: 'placeholder',
          fullName: 'dev/placeholder',
          description: null,
          languages: [],
          readmeExcerpt: '# placeholder',
          stars: 0,
          rootPaths: ['README.md'],
          tools: [],
        }),
      ],
      data
    )
    expect(suggestions).toHaveLength(0)
  })
})

describe('enrichmentSuggestionsForLinkedRepo', () => {
  it('does not re-offer tools already on the project card', () => {
    const data = emptyProfileData()
    const project = {
      id: 'p1',
      name: 'HireIQ',
      description: '',
      bullets: ['Built app'],
      technologies: ['Next.js', 'Supabase', 'TypeScript', 'React'],
      url: '',
      github: 'https://github.com/dev/hireiq',
    }
    const suggestions = enrichmentSuggestionsForLinkedRepo(project, baseRepo(), data)
    expect(suggestions.every(s => !s.id.includes('-tool-'))).toBe(true)
  })
})

describe('ensureGitHubUrl', () => {
  it('adds github url when missing', () => {
    const data = emptyProfileData()
    const next = ensureGitHubUrl(data, 'dev', 'https://github.com/dev')
    expect(next.urls.some(u => u.url.includes('github.com/dev'))).toBe(true)
  })

  it('does not duplicate github url', () => {
    const data = emptyProfileData()
    data.urls = [{ id: 'u1', label: 'GitHub', url: 'https://github.com/dev' }]
    const next = ensureGitHubUrl(data, 'dev', 'https://github.com/dev')
    expect(next.urls).toHaveLength(1)
  })
})
