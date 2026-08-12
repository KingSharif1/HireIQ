import { describe, expect, it } from 'vitest'
import { githubSuggestionsFromRepos, ensureGitHubUrl } from '@/lib/github/suggestions'
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

  it('suggests bullet for matched project without github url', () => {
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
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].targetEntryId).toBe('p1')
    expect(suggestions[0].newProject).toBeUndefined()
  })

  it('skips archived unmatched repos', () => {
    const data = emptyProfileData()
    const suggestions = githubSuggestionsFromRepos([baseRepo({ status: 'archived' })], data)
    expect(suggestions).toHaveLength(0)
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
