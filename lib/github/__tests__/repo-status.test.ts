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
})
