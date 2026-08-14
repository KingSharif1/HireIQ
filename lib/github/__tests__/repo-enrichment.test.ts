import { describe, expect, it } from 'vitest'
import { cleanReadmeExcerpt, isMeaningfulRepo } from '@/lib/github/repo-quality'
import { buildRepoHighlight } from '@/lib/github/repo-enrichment'
import { formatGitHubContextForAi } from '@/lib/profile/github-context'
import type { GitHubRepoSnapshot, GitHubProfileData } from '@/lib/github/types'

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

describe('cleanReadmeExcerpt', () => {
  it('strips markdown headings and links', () => {
    const raw = '# HireIQ\n\nBuild [resumes](https://example.com) with `AI`.'
    expect(cleanReadmeExcerpt(raw)).toContain('HireIQ')
    expect(cleanReadmeExcerpt(raw)).not.toContain('[')
  })
})

describe('isMeaningfulRepo', () => {
  it('rejects empty shell repos', () => {
    expect(
      isMeaningfulRepo(
        baseRepo({
          description: null,
          languages: [],
          readmeExcerpt: '# hireiq',
          stars: 0,
          rootPaths: ['README.md'],
        })
      )
    ).toBe(false)
  })

  it('accepts repos with readme and code structure', () => {
    expect(
      isMeaningfulRepo(
        baseRepo({
          readmeExcerpt:
            'HireIQ is an AI resume tailoring platform with job gap analysis and ATS scoring for developers.',
          rootPaths: ['src', 'app', 'package.json'],
          tools: ['next', 'supabase'],
        })
      )
    ).toBe(true)
  })
})

describe('buildRepoHighlight', () => {
  it('includes stack and readme signal', () => {
    const bullet = buildRepoHighlight(
      baseRepo({
        readmeExcerpt:
          'Built HireIQ — full-stack job search workspace with AI tailoring, GitHub sync, and auto-apply.',
        tools: ['next', 'supabase', 'playwright'],
        rootPaths: ['app', 'components', 'lib'],
      })
    )
    expect(bullet.toLowerCase()).toContain('hireiq')
    expect(bullet).toMatch(/next|TypeScript/i)
  })
})

describe('formatGitHubContextForAi', () => {
  it('includes meaningful repos only', () => {
    const data: GitHubProfileData = {
      username: 'dev',
      profileUrl: 'https://github.com/dev',
      avatarUrl: null,
      syncedAt: new Date().toISOString(),
      repos: [
        baseRepo(),
        baseRepo({
          id: 2,
          name: 'empty',
          fullName: 'dev/empty',
          description: null,
          languages: [],
          readmeExcerpt: '',
          stars: 0,
        }),
      ],
    }
    const ctx = formatGitHubContextForAi(data)
    expect(ctx).toContain('dev/hireiq')
    expect(ctx).not.toContain('dev/empty')
  })
})
