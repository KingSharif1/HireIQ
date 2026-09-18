import type {
  GitHubProfileData,
  GitHubRepoSnapshot,
  RepoIntelligenceRecord,
} from '@/lib/github/types'
import { isMeaningfulRepo } from '@/lib/github/repo-quality'
import { buildRepoHighlight } from '@/lib/github/repo-enrichment'
import { findRepoForProject } from '@/lib/github/scan-project'
import { selectRelevantProjectIds } from '@/lib/tailor/job-relevance'
import type { JobExtractedData, ProfileData } from '@/types'

const MAX_REPOS = 12
const MAX_CHARS = 12_000

function repoLine(repo: GitHubRepoSnapshot): string {
  const highlight = buildRepoHighlight(repo)
  const paths = repo.rootPaths?.slice(0, 8).join(', ')
  const readme = repo.readmeExcerpt?.slice(0, 280)
  const bits = [`- ${repo.fullName}: ${highlight}`]
  if (paths) bits.push(`  Root: ${paths}`)
  if (readme && readme !== highlight) bits.push(`  README: ${readme}`)
  return bits.join('\n')
}

function intelligenceBlock(record: RepoIntelligenceRecord): string {
  const intelligence = record.intelligence
  if (!intelligence) return ''
  const lines = [
    `- ${record.fullName} (analyzed commit ${record.commitSha.slice(0, 12)}): ${intelligence.overview}`,
  ]
  if (intelligence.architecture.length) {
    lines.push(`  Architecture: ${intelligence.architecture.slice(0, 4).join('; ')}`)
  }
  if (intelligence.tools.length) {
    lines.push('  Verified tool usage:')
    for (const tool of intelligence.tools.slice(0, 8)) {
      lines.push(`    - ${tool.name}: ${tool.usage} [${tool.evidencePaths.join(', ')}]`)
    }
  }
  if (intelligence.features.length) {
    lines.push('  Implemented features:')
    for (const feature of intelligence.features.slice(0, 6)) {
      lines.push(`    - ${feature.name}: ${feature.detail} [${feature.evidencePaths.join(', ')}]`)
    }
  }
  if (intelligence.resumeHighlights.length) {
    lines.push('  Resume-safe evidence:')
    for (const highlight of intelligence.resumeHighlights) {
      lines.push(`    - ${highlight.text} [${highlight.evidencePaths.join(', ')}]`)
    }
  }
  return lines.join('\n')
}

interface GitHubContextOptions {
  profileData?: ProfileData
  job?: JobExtractedData
  intelligenceByRepoId?: Record<number, RepoIntelligenceRecord>
}

/**
 * Compact GitHub project context for gap analysis / tailoring prompts.
 * Only includes repos with real signal (README, code, tools, etc.).
 */
export function formatGitHubContextForAi(
  githubData: GitHubProfileData | null | undefined,
  options: GitHubContextOptions = {}
): string {
  if (!githubData?.repos?.length) {
    return 'No GitHub repos synced. Use resume/profile projects only.'
  }

  const relevantProjectIds =
    options.profileData && options.job
      ? new Set(selectRelevantProjectIds(options.profileData.projects ?? [], options.job))
      : new Set<string>()
  const deepRepoIds = new Set<number>()
  const deepBlocks: string[] = []
  if (options.profileData && options.intelligenceByRepoId) {
    for (const project of options.profileData.projects ?? []) {
      if (relevantProjectIds.size > 0 && !relevantProjectIds.has(project.id)) continue
      const repo = findRepoForProject(project, githubData.repos)
      const record = repo ? options.intelligenceByRepoId[repo.id] : undefined
      if (!repo || !record?.intelligence || deepRepoIds.has(repo.id)) continue
      deepRepoIds.add(repo.id)
      deepBlocks.push(intelligenceBlock(record))
    }
  }

  const meaningful = githubData.repos
    .filter(r => !r.isPrivate && isMeaningfulRepo(r))
    .filter(r => !deepRepoIds.has(r.id))
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

  if (!meaningful.length && !deepBlocks.length) {
    return 'GitHub connected but no repos had enough README/code context yet. Re-sync after adding READMEs or code.'
  }

  const header = `GitHub user @${githubData.username} (synced ${githubData.syncedAt.slice(0, 10)}):`
  const sections = []
  if (deepBlocks.length) sections.push(`Deep repository evidence:\n${deepBlocks.join('\n')}`)
  if (meaningful.length) sections.push(`Repository overview:\n${meaningful.map(repoLine).join('\n')}`)
  let body = sections.join('\n')
  const full = `${header}\n${body}`
  if (full.length <= MAX_CHARS) return full
  body = [
    ...deepBlocks,
    ...meaningful
    .map(r => `- ${r.fullName}: ${buildRepoHighlight(r)}`)
  ].join('\n')
  return `${header}\n${body}`.slice(0, MAX_CHARS)
}
