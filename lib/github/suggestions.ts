import type { GitHubRepoSnapshot } from './types'
import { buildRepoHighlight, isResumeWorthyBullet } from './resume-bullet'
import { isMeaningfulRepo } from './repo-quality'
import { repoMatchesProject } from './repo-status'
import type { PendingSuggestion, ProfileData, ResumeProject } from '@/types'
import { uid } from '@/lib/profile/data'

const GITHUB_SOURCE_ID = 'github-sync'

function buildProjectBullet(repo: GitHubRepoSnapshot): string {
  return buildRepoHighlight(repo)
}

function buildSuggestionReason(repo: GitHubRepoSnapshot): string {
  return `“${repo.fullName}” isn’t on your profile yet. Add it as a project, or skip it.`
}

export function githubSuggestionsFromRepos(
  repos: GitHubRepoSnapshot[],
  profileData: ProfileData
): PendingSuggestion[] {
  const now = new Date().toISOString()
  const suggestions: PendingSuggestion[] = []
  const projects = profileData.projects ?? []

  for (const repo of repos) {
    if (repo.isPrivate) continue

    const matched = projects.find(p => repoMatchesProject(repo, p))
    const suggestionId = `gh-${repo.id}`

    if (matched) {
      // Already on the profile — linking happens in sync. Highlights are opt-in on the project card.
      continue
    }

    if (repo.status === 'archived') continue
    if (!isMeaningfulRepo(repo)) continue

    const highlight = buildProjectBullet(repo)
    if (!isResumeWorthyBullet(highlight) && !repo.description?.trim()) continue

    const description = repo.description?.trim() || highlight

    suggestions.push({
      id: suggestionId,
      section: 'projects',
      proposedText: highlight,
      reason: buildSuggestionReason(repo),
      sourceTailoredResumeId: GITHUB_SOURCE_ID,
      jobLabel: 'GitHub sync',
      createdAt: now,
      source: 'github',
      newProject: {
        name: repo.name,
        description,
        github: repo.htmlUrl,
        technologies: [...new Set([...(repo.tools ?? []), ...(repo.languages ?? [])])]
          .filter(t => !['react-dom', 'eslint', 'prettier'].includes(t.toLowerCase()))
          .slice(0, 8),
        bullets: [highlight],
      },
    })
  }

  return suggestions
}

export function ensureGitHubUrl(data: ProfileData, username: string, profileUrl: string): ProfileData {
  const hasGithub = data.urls.some(u => /github/i.test(u.label) || u.url.includes('github.com'))
  if (hasGithub) return data

  return {
    ...data,
    urls: [
      ...data.urls,
      { id: uid('url'), label: 'GitHub', url: profileUrl || `https://github.com/${username}` },
    ],
  }
}

export function linkProjectGithubUrls(projects: ResumeProject[], repos: GitHubRepoSnapshot[]): ResumeProject[] {
  return projects.map(project => {
    if (project.github?.trim()) return project
    const match = repos.find(r => repoMatchesProject(r, project))
    if (!match) return project
    return { ...project, github: match.htmlUrl, source: project.source ?? 'github' }
  })
}
