import { describe, expect, it } from 'vitest'
import { cleanReadmeExcerpt, isMeaningfulRepo } from '@/lib/github/repo-quality'
import { buildRepoHighlight } from '@/lib/github/repo-enrichment'
import { formatGitHubContextForAi } from '@/lib/profile/github-context'
import type {
  GitHubRepoSnapshot,
  GitHubProfileData,
  RepoIntelligenceRecord,
} from '@/lib/github/types'
import { emptyProfileData } from '@/lib/profile/data'
import type { JobExtractedData } from '@/types'

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

  it('rejects username profile README repos', () => {
    expect(
      isMeaningfulRepo(
        baseRepo({
          name: 'dev',
          fullName: 'dev/dev',
          description: null,
          languages: [],
          tools: [],
          stars: 0,
          rootPaths: ['README.md'],
          readmeExcerpt: 'Hi I am a developer.',
        })
      )
    ).toBe(false)
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
    expect(bullet.toLowerCase()).toMatch(/tailor|workspace|auto-apply/)
    expect(bullet).not.toContain('Tools:')
    expect(bullet).not.toMatch(/<[a-z]/i)
  })

  it('does not dump README HTML as a bullet', () => {
    const bullet = buildRepoHighlight(
      baseRepo({
        name: 'kingslive',
        description: null,
        readmeExcerpt:
          '<div align="center"> 👑 KingsLive My personal site — portfolio up front, experiments in the back',
        tools: ['next', 'react', 'react-dom', 'tailwindcss', 'typescript'],
      })
    )
    expect(bullet).not.toContain('<div')
    expect(bullet).not.toContain('👑')
    expect(bullet.toLowerCase()).toMatch(/portfolio|next\.js|personal site/)
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

  it('expands deep evidence only for a linked job-relevant project', () => {
    const frontend = baseRepo({ id: 10, name: 'web-app', fullName: 'dev/web-app' })
    const backend = baseRepo({ id: 11, name: 'data-tool', fullName: 'dev/data-tool' })
    const data: GitHubProfileData = {
      username: 'dev',
      profileUrl: 'https://github.com/dev',
      avatarUrl: null,
      syncedAt: new Date().toISOString(),
      repos: [frontend, backend],
    }
    const profile = emptyProfileData()
    profile.projects = [
      {
        id: 'frontend-project',
        name: 'Web App',
        description: 'React frontend application',
        bullets: [],
        technologies: ['React'],
        url: '',
        github: frontend.htmlUrl,
      },
      {
        id: 'backend-project',
        name: 'Data Tool',
        description: 'Python data processing',
        bullets: [],
        technologies: ['Python'],
        url: '',
        github: backend.htmlUrl,
      },
    ]
    const record = (repo: GitHubRepoSnapshot, usage: string): RepoIntelligenceRecord => ({
      id: `intel-${repo.id}`,
      repoId: repo.id,
      fullName: repo.fullName,
      defaultBranch: 'main',
      commitSha: `${repo.id}`.repeat(40).slice(0, 40),
      repoPushedAt: repo.pushedAt,
      status: 'ready',
      intelligence: {
        overview: usage,
        architecture: [],
        tools: [],
        features: [],
        keyFiles: [],
        resumeHighlights: [],
        limitations: [],
      },
      treeFileCount: 20,
      analyzedFileCount: 5,
      treeTruncated: false,
      error: null,
      updatedAt: new Date().toISOString(),
    })
    const job: JobExtractedData = {
      title: 'Frontend Engineer',
      company: 'Example',
      required_skills: ['React'],
      preferred_skills: [],
      required_experience_years: 0,
      education_requirement: '',
      keywords: ['frontend'],
      responsibilities: [],
      ats_system: '',
      red_flags: [],
      company_values: [],
      compensation: { min: null, max: null, currency: 'USD', period: 'year' },
      work_type: '',
      seniority: '',
      summary: '',
    }

    const context = formatGitHubContextForAi(data, {
      profileData: profile,
      job,
      intelligenceByRepoId: {
        10: record(frontend, 'Deep React frontend evidence'),
        11: record(backend, 'Deep Python backend evidence'),
      },
    })

    expect(context).toContain('Deep React frontend evidence')
    expect(context).not.toContain('Deep Python backend evidence')
  })
})
