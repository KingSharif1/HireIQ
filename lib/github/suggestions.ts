import type { GitHubRepoSnapshot } from './types'
import { buildRepoHighlight } from './repo-enrichment'
import { isMeaningfulRepo } from './repo-quality'
import { repoMatchesProject } from './repo-status'
import type { PendingSuggestion, ProfileData, ResumeProject } from '@/types'
import { uid } from '@/lib/profile/data'

const GITHUB_SOURCE_ID = 'github-sync'

function buildProjectBullet(repo: GitHubRepoSnapshot): string {
  return buildRepoHighlight(repo)
}

function buildSuggestionReason(repo: GitHubRepoSnapshot, matched?: ResumeProject): string {
  const signals: string[] = []
  if (repo.readmeExcerpt) signals.push('README')
  if (repo.rootPaths?.length) signals.push('repo structure')
  if (repo.tools?.length) signals.push('dependencies')
  if (repo.languages.length) signals.push('languages')
  const context = signals.length ? ` (from ${signals.join(', ')})` : ''

  if (matched) {
    return `GitHub repo "${repo.fullName}" matches your project "${matched.name}". We read the repo${context} — add a specific bullet?`
  }
  return `Repo "${repo.fullName}" looks like real work${context} but isn't in your profile projects yet.`
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
      const alreadyLinked = matched.github?.includes(repo.fullName) || matched.github?.includes(repo.name)
      const hasRichBullet = matched.bullets.some(b => b.trim().length > 40)
      if (alreadyLinked && matched.description?.trim() && hasRichBullet) continue

      // Matched projects: only suggest if we have meaningful repo context.
      if (!isMeaningfulRepo(repo) && !repo.readmeExcerpt && !repo.description?.trim()) continue

      suggestions.push({
        id: suggestionId,
        section: 'projects',
        targetEntryId: matched.id,
        proposedText: buildProjectBullet(repo),
        reason: buildSuggestionReason(repo, matched),
        sourceTailoredResumeId: GITHUB_SOURCE_ID,
        jobLabel: 'GitHub sync',
        createdAt: now,
        source: 'github',
      })
      continue
    }

    if (repo.status === 'archived') continue
    if (!isMeaningfulRepo(repo)) continue

    const description =
      repo.description?.trim() ||
      repo.readmeExcerpt?.split(/[.!?]/)[0]?.trim().slice(0, 160) ||
      repo.name

    suggestions.push({
      id: suggestionId,
      section: 'projects',
      proposedText: description,
      reason: buildSuggestionReason(repo),
      sourceTailoredResumeId: GITHUB_SOURCE_ID,
      jobLabel: 'GitHub sync',
      createdAt: now,
      source: 'github',
      newProject: {
        name: repo.name,
        description,
        github: repo.htmlUrl,
        technologies: [...new Set([...(repo.tools ?? []), ...repo.languages])].slice(0, 8),
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
    return { ...project, github: match.htmlUrl, source: project.source ?? 'github' }
  })
}
