import type { GitHubRepoSnapshot } from './types'
import { buildRepoHighlight, isResumeWorthyBullet, stackLabels } from './resume-bullet'
import { isMeaningfulRepo, isPortfolioLikeProject, isProfileReadmeRepo } from './repo-quality'
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

function projectHasGithubUrl(project: ResumeProject, repo: GitHubRepoSnapshot): boolean {
  const gh = project.github?.trim()
  if (!gh) return false
  return gh.includes(repo.fullName) || gh.replace(/\/$/, '') === repo.htmlUrl.replace(/\/$/, '')
}

function alreadyHasBullet(project: ResumeProject, bullet: string): boolean {
  const key = bullet.toLowerCase().slice(0, 48)
  return project.bullets.some(
    b => b.toLowerCase().includes(key) || key.includes(b.toLowerCase().slice(0, 48))
  )
}

function toolSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function skillPoolsInclude(data: ProfileData, label: string): boolean {
  const pools = [
    ...data.skills.technical,
    ...data.skills.tools,
    ...data.skills.languages,
    ...data.skills.soft,
  ]
  return pools.some(s => s.toLowerCase() === label.toLowerCase())
}

/** Option A: tools + bullets for a linked card — pending only, never silent master writes. */
export function enrichmentSuggestionsForLinkedRepo(
  project: ResumeProject,
  repo: GitHubRepoSnapshot,
  profileData: ProfileData,
  now = new Date().toISOString()
): PendingSuggestion[] {
  const dismissed = new Set(profileData.dismissedSuggestionIds ?? [])
  const out: PendingSuggestion[] = []

  const highlight = buildProjectBullet(repo)
  const bulletId = `gh-${repo.id}-bullet`
  if (
    !dismissed.has(bulletId) &&
    isResumeWorthyBullet(highlight) &&
    !alreadyHasBullet(project, highlight)
  ) {
    out.push({
      id: bulletId,
      section: 'projects',
      targetEntryId: project.id,
      proposedText: highlight,
      reason: `New highlight from ${repo.fullName}. Accept to add it to this project, or deny to hide it.`,
      sourceTailoredResumeId: GITHUB_SOURCE_ID,
      jobLabel: 'GitHub sync',
      createdAt: now,
      source: 'github',
    })
  }

  const missingTools = stackLabels(repo, 8).filter(
    label =>
      !project.technologies.some(t => t.toLowerCase() === label.toLowerCase()) &&
      !skillPoolsInclude(profileData, label)
  )

  for (const tech of missingTools) {
    const slug = toolSlug(tech)
    if (!slug) continue
    const toolId = `gh-${repo.id}-tool-${slug}`
    if (dismissed.has(toolId)) continue
    out.push({
      id: toolId,
      section: 'projects',
      targetEntryId: project.id,
      proposedText: tech,
      reason: `Add ${tech} from ${repo.fullName} to this project’s tools.`,
      sourceTailoredResumeId: GITHUB_SOURCE_ID,
      jobLabel: 'GitHub sync',
      createdAt: now,
      source: 'github',
    })
  }

  return out
}

export function githubSuggestionsFromRepos(
  repos: GitHubRepoSnapshot[],
  profileData: ProfileData
): PendingSuggestion[] {
  const now = new Date().toISOString()
  const suggestions: PendingSuggestion[] = []
  const projects = profileData.projects ?? []
  const dismissed = new Set(profileData.dismissedSuggestionIds ?? [])

  for (const repo of repos) {
    if (repo.isPrivate) continue

    const linked = projects.find(p => projectHasGithubUrl(p, repo))
    if (linked) {
      suggestions.push(...enrichmentSuggestionsForLinkedRepo(linked, repo, profileData, now))
      continue
    }

    // Name match without a GitHub URL → soft ask in the UI, never invent a second card.
    const matched = projects.find(p => repoMatchesProject(repo, p))
    if (matched) continue

    if (repo.status === 'archived') continue
    if (!isMeaningfulRepo(repo)) continue

    const suggestionId = `gh-${repo.id}`
    if (dismissed.has(suggestionId)) continue

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

export function linkProjectGithubUrls(
  projects: ResumeProject[],
  repos: GitHubRepoSnapshot[],
  username?: string | null
): ResumeProject[] {
  return projects.map(project => {
    if (project.github?.trim()) return project
    const match = repos.find(r => {
      if (!repoMatchesProject(r, project)) return false
      // Don't silently attach a username README to a same-named empty card.
      if (isProfileReadmeRepo(r, username) && !isPortfolioLikeProject(project)) return false
      return true
    })
    if (!match) return project
    return { ...project, github: match.htmlUrl, source: project.source ?? 'github' }
  })
}
