import type { GitHubRepoSnapshot } from './types'
import { repoMatchesProject } from './repo-status'
import type { PendingSuggestion, ProfileData, ResumeProject } from '@/types'
import { uid } from '@/lib/profile/data'

const GITHUB_SOURCE_ID = 'github-sync'

function buildProjectBullet(repo: GitHubRepoSnapshot): string {
  const langs = repo.languages.slice(0, 4).join(', ')
  const stars = repo.stars > 0 ? `${repo.stars} stars · ` : ''
  const desc = repo.description?.trim() || 'Open-source project'
  return `${desc}${langs ? ` — built with ${langs}` : ''} (${stars}${repo.status} on GitHub)`
}

export function githubSuggestionsFromRepos(
  repos: GitHubRepoSnapshot[],
  profileData: ProfileData,
  existingPending: PendingSuggestion[] = []
): PendingSuggestion[] {
  const now = new Date().toISOString()
  const existingIds = new Set(existingPending.map(s => s.id))
  const suggestions: PendingSuggestion[] = []
  const projects = profileData.projects ?? []

  for (const repo of repos) {
    if (repo.isPrivate) continue

    const matched = projects.find(p => repoMatchesProject(repo, p))
    const suggestionId = `gh-${repo.id}`

    if (existingIds.has(suggestionId)) continue

    if (matched) {
      const alreadyLinked = matched.github?.includes(repo.fullName) || matched.github?.includes(repo.name)
      if (alreadyLinked && matched.description?.trim()) continue

      suggestions.push({
        id: suggestionId,
        section: 'projects',
        targetEntryId: matched.id,
        proposedText: buildProjectBullet(repo),
        reason: `GitHub repo "${repo.fullName}" matches your project "${matched.name}". Add a bullet from repo activity?`,
        sourceTailoredResumeId: GITHUB_SOURCE_ID,
        jobLabel: 'GitHub sync',
        createdAt: now,
        source: 'github',
      })
      continue
    }

    if (repo.status === 'archived') continue

    suggestions.push({
      id: suggestionId,
      section: 'projects',
      proposedText: repo.description?.trim() || repo.name,
      reason: `Repo "${repo.fullName}" is on GitHub but not in your profile projects.`,
      sourceTailoredResumeId: GITHUB_SOURCE_ID,
      jobLabel: 'GitHub sync',
      createdAt: now,
      source: 'github',
      newProject: {
        name: repo.name,
        description: repo.description?.trim() ?? '',
        github: repo.htmlUrl,
        technologies: repo.languages.slice(0, 8),
        bullets: [buildProjectBullet(repo)],
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
    return { ...project, github: match.htmlUrl }
  })
}
