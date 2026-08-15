import type { GitHubRepoSnapshot } from './types'
import { repoMatchesProject } from './repo-status'
import { buildRepoHighlight, isResumeWorthyBullet, stackLabels } from './resume-bullet'
import type { ResumeProject } from '@/types'

export function findRepoForProject(
  project: Pick<ResumeProject, 'name' | 'github'>,
  repos: GitHubRepoSnapshot[]
): GitHubRepoSnapshot | undefined {
  if (project.github?.trim()) {
    const byUrl = repos.find(
      r =>
        project.github.includes(r.fullName) ||
        project.github.replace(/\/$/, '') === r.htmlUrl.replace(/\/$/, '')
    )
    if (byUrl) return byUrl
  }
  return repos.find(r => repoMatchesProject(r, { name: project.name, github: project.github }))
}

export type RepoScanResult =
  | { kind: 'none'; message: string }
  | { kind: 'highlight'; bullet: string; extraTechnologies: string[] }

function alreadyHas(project: ResumeProject, bullet: string): boolean {
  const key = bullet.toLowerCase().slice(0, 48)
  return project.bullets.some(b => b.toLowerCase().includes(key) || key.includes(b.toLowerCase().slice(0, 48)))
}

/** Compare a linked repo to the project card. No network — uses last GitHub sync. */
export function scanLinkedRepo(
  project: ResumeProject,
  repos: GitHubRepoSnapshot[]
): RepoScanResult {
  const repo = findRepoForProject(project, repos)
  if (!repo) {
    return { kind: 'none', message: 'Link a GitHub repo first, then we can check it for highlights.' }
  }

  const extraTechnologies = stackLabels(repo, 8).filter(
    label => !project.technologies.some(t => t.toLowerCase() === label.toLowerCase())
  )
  const bullet = buildRepoHighlight(repo)
  const worthy = isResumeWorthyBullet(bullet) && !alreadyHas(project, bullet)

  if (!worthy && extraTechnologies.length === 0) {
    return {
      kind: 'none',
      message: `Nothing new on ${repo.fullName} versus what’s already on this project.`,
    }
  }

  if (!worthy) {
    return {
      kind: 'highlight',
      bullet: extraTechnologies.length
        ? `Shipped with ${extraTechnologies.slice(0, 4).join(', ')}.`
        : bullet,
      extraTechnologies,
    }
  }

  return { kind: 'highlight', bullet, extraTechnologies }
}

export function projectFromRepo(repo: GitHubRepoSnapshot, id: string): ResumeProject {
  const highlight = buildRepoHighlight(repo)
  const description = repo.description?.trim() || highlight
  const name = repo.name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return {
    id,
    name,
    description,
    bullets: isResumeWorthyBullet(highlight) ? [highlight] : [description],
    technologies: stackLabels(repo, 8),
    url: '',
    github: repo.htmlUrl,
    source: 'github',
  }
}
