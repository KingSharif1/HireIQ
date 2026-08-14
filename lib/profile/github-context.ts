import type { GitHubProfileData, GitHubRepoSnapshot } from '@/lib/github/types'
import { isMeaningfulRepo } from '@/lib/github/repo-quality'
import { buildRepoHighlight } from '@/lib/github/repo-enrichment'

const MAX_REPOS = 8
const MAX_CHARS = 3500

function repoLine(repo: GitHubRepoSnapshot): string {
  const highlight = buildRepoHighlight(repo)
  const paths = repo.rootPaths?.slice(0, 8).join(', ')
  const readme = repo.readmeExcerpt?.slice(0, 280)
  const bits = [`- ${repo.fullName}: ${highlight}`]
  if (paths) bits.push(`  Root: ${paths}`)
  if (readme && readme !== highlight) bits.push(`  README: ${readme}`)
  return bits.join('\n')
}

/**
 * Compact GitHub project context for gap analysis / tailoring prompts.
 * Only includes repos with real signal (README, code, tools, etc.).
 */
export function formatGitHubContextForAi(githubData: GitHubProfileData | null | undefined): string {
  if (!githubData?.repos?.length) {
    return 'No GitHub repos synced. Use resume/profile projects only.'
  }

  const meaningful = githubData.repos
    .filter(r => !r.isPrivate && isMeaningfulRepo(r))
    .sort((a, b) => {
      const score = (r: GitHubRepoSnapshot) =>
        (r.status === 'active' ? 4 : 0) +
        (r.readmeExcerpt ? 3 : 0) +
        (r.tools?.length ?? 0) +
        r.stars +
        r.languages.length
      return score(b) - score(a)
    })
    .slice(0, MAX_REPOS)

  if (!meaningful.length) {
    return 'GitHub connected but no repos had enough README/code context yet. Re-sync after adding READMEs or code.'
  }

  const header = `GitHub user @${githubData.username} (synced ${githubData.syncedAt.slice(0, 10)}):`
  let body = meaningful.map(repoLine).join('\n')
  const full = `${header}\n${body}`
  if (full.length <= MAX_CHARS) return full
  body = meaningful
    .map(r => `- ${r.fullName}: ${buildRepoHighlight(r)}`)
    .join('\n')
  return `${header}\n${body}`.slice(0, MAX_CHARS)
}
