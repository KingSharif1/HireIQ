import { describe, expect, it } from 'vitest'
import { repoMatchesProject, repoStatus, normalizeRepoName } from '@/lib/github/repo-status'

describe('normalizeRepoName', () => {
  it('strips github url and punctuation', () => {
    expect(normalizeRepoName('https://github.com/user/my-app')).toBe('usermyapp')
    expect(normalizeRepoName('My-App')).toBe('myapp')
  })
})

describe('repoStatus', () => {
  it('marks archived repos', () => {
    expect(repoStatus({ archived: true, pushed_at: new Date().toISOString() })).toBe('archived')
  })

  it('marks stale when pushed over 6 months ago', () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
    expect(repoStatus({ archived: false, pushed_at: old })).toBe('stale')
  })

  it('marks active for recent pushes', () => {
    expect(repoStatus({ archived: false, pushed_at: new Date().toISOString() })).toBe('active')
  })
})

describe('repoMatchesProject', () => {
  it('matches by project name', () => {
    expect(
      repoMatchesProject(
        { fullName: 'user/hireiq', htmlUrl: 'https://github.com/user/hireiq', name: 'hireiq' },
        { name: 'HireIQ', github: '' }
      )
    ).toBe(true)
  })

  it('matches by github url on project', () => {
    expect(
      repoMatchesProject(
        { fullName: 'user/other', htmlUrl: 'https://github.com/user/other', name: 'other' },
        { name: 'Unrelated', github: 'https://github.com/user/other' }
      )
    ).toBe(true)
  })

  it('matches when the repo name has an affix the project name lacks', () => {
    expect(
      repoMatchesProject(
        {
          fullName: 'k1ngsharif/mapping-robot-ros2',
          htmlUrl: 'https://github.com/k1ngsharif/mapping-robot-ros2',
          name: 'mapping-robot-ros2',
        },
        { name: 'Mapping Robot', github: '' }
      )
    ).toBe(true)
  })

  it('matches when the project name has extra descriptive words', () => {
    expect(
      repoMatchesProject(
        {
          fullName: 'k1ngsharif/cowboy-cards',
          htmlUrl: 'https://github.com/k1ngsharif/cowboy-cards',
          name: 'cowboy-cards',
        },
        { name: 'Cowboy Cards \u2014 SaaS flashcard app', github: '' }
      )
    ).toBe(true)
  })

  it('does not match on a lone short generic token', () => {
    expect(
      repoMatchesProject(
        {
          fullName: 'k1ngsharif/some-api',
          htmlUrl: 'https://github.com/k1ngsharif/some-api',
          name: 'some-api',
        },
        { name: 'API', github: '' }
      )
    ).toBe(false)
  })

  it('does not match unrelated names', () => {
    expect(
      repoMatchesProject(
        {
          fullName: 'k1ngsharif/nemt-billing',
          htmlUrl: 'https://github.com/k1ngsharif/nemt-billing',
          name: 'nemt-billing',
        },
        { name: 'Cowboy Cards', github: '' }
      )
    ).toBe(false)
  })
})
