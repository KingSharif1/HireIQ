import { describe, expect, it } from 'vitest'
import { scanLinkedRepo, projectFromRepo, planRepoAdd } from '@/lib/github/scan-project'
import type { GitHubRepoSnapshot } from '@/lib/github/types'
import type { ResumeProject } from '@/types'

const repo = (over: Partial<GitHubRepoSnapshot> = {}): GitHubRepoSnapshot => ({
  id: 1,
  name: 'nemt-billing',
  fullName: 'dev/nemt-billing',
  htmlUrl: 'https://github.com/dev/nemt-billing',
  description: 'Billing for non-emergency medical transport',
  languages: ['TypeScript'],
  stars: 0,
  pushedAt: new Date().toISOString(),
  status: 'active',
  topics: [],
  isFork: false,
  isPrivate: false,
  tools: ['next', 'stripe', 'strapi'],
  ...over,
})

const project = (over: Partial<ResumeProject> = {}): ResumeProject => ({
  id: 'p1',
  name: 'NEMT Billing',
  description: '',
  bullets: ['Shipped Stripe invoicing for dispatchers'],
  technologies: ['Next.js'],
  url: '',
  github: 'https://github.com/dev/nemt-billing',
  ...over,
})

describe('scanLinkedRepo', () => {
  it('asks to link when no repo is attached', () => {
    const result = scanLinkedRepo(project({ github: '', name: 'Unrelated side hustle' }), [repo()])
    expect(result.kind).toBe('none')
  })

  it('returns a highlight for a linked repo', () => {
    const result = scanLinkedRepo(project({ bullets: [''] }), [repo()])
    expect(result.kind).toBe('highlight')
    if (result.kind === 'highlight') {
      expect(result.bullet.toLowerCase()).toMatch(/billing|stripe|next/)
      expect(result.bullet).not.toContain('<div')
    }
  })
})

describe('projectFromRepo', () => {
  it('fills a resume-shaped project from the last GitHub sync', () => {
    const created = projectFromRepo(repo(), 'proj-new')
    expect(created.id).toBe('proj-new')
    expect(created.github).toBe('https://github.com/dev/nemt-billing')
    expect(created.source).toBe('github')
    expect(created.name.toLowerCase()).toContain('nemt')
    expect(created.bullets.length).toBeGreaterThan(0)
    expect(created.bullets[0]).not.toContain('<div')
  })
})

describe('planRepoAdd', () => {
  it('asks to link a profile README to a portfolio project', () => {
    const profileReadme = repo({
      id: 9,
      name: 'KingSharif1',
      fullName: 'KingSharif1/KingSharif1',
      htmlUrl: 'https://github.com/KingSharif1/KingSharif1',
      description: null,
      languages: [],
      tools: [],
      rootPaths: ['README.md'],
    })
    const portfolio = project({
      id: 'pf',
      name: 'Personal Portfolio',
      github: '',
      url: 'https://kingsharif.com',
    })
    const plan = planRepoAdd(profileReadme, [portfolio], 'KingSharif1')
    expect(plan.action).toBe('ask-link')
    if (plan.action === 'ask-link') {
      expect(plan.project.id).toBe('pf')
    }
  })

  it('skips thin profile READMEs when there is no portfolio to link', () => {
    const profileReadme = repo({
      id: 9,
      name: 'KingSharif1',
      fullName: 'KingSharif1/KingSharif1',
      htmlUrl: 'https://github.com/KingSharif1/KingSharif1',
      description: null,
      languages: [],
      tools: [],
      rootPaths: ['README.md'],
    })
    const plan = planRepoAdd(profileReadme, [], 'KingSharif1')
    expect(plan.action).toBe('skip-thin')
  })

  it('creates a real product repo as a new project', () => {
    expect(planRepoAdd(repo(), []).action).toBe('create')
  })
})
