import { githubFetch } from './client'
import type { GitHubApiRepo } from './types'

const MAX_TREE_FILES = 20_000
const MAX_SELECTED_FILES = 18
const MAX_FILE_BYTES = 96_000
const MAX_SOURCE_CHARS = 120_000

interface GitHubCommit {
  sha: string
  commit: { tree: { sha: string } }
}

export interface GitHubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
}

interface GitHubTree {
  sha: string
  truncated: boolean
  tree: GitHubTreeItem[]
}

interface GitHubBlob {
  content?: string
  encoding?: string
  size?: number
}

export interface SelectedRepoFile {
  path: string
  content: string
}

export interface RepositorySourceSnapshot {
  repo: GitHubApiRepo
  defaultBranch: string
  commitSha: string
  treeFileCount: number
  treeTruncated: boolean
  selectedFiles: SelectedRepoFile[]
  sourceBundle: string
}

export interface RepositoryHead {
  repo: GitHubApiRepo
  defaultBranch: string
  commitSha: string
  treeSha: string
}

const EXCLUDED_PATH =
  /(^|\/)(node_modules|vendor|dist|build|coverage|\.next|\.nuxt|target|bin|obj|public\/assets|generated|__snapshots__)(\/|$)/i
const EXCLUDED_FILE =
  /(^|\/)(\.env[^/]*|.*\.(lock|map|min\.(js|css)|png|jpe?g|gif|webp|ico|pdf|zip|gz|tar|woff2?|ttf|eot|mp4|mov|mp3|pem|p12|key))$/i
const SECRET_ASSIGNMENT =
  /((?:api[_-]?key|access[_-]?token|client[_-]?secret|password|private[_-]?key)\s*[:=]\s*["'`])([^"'`]+)(["'`])/gi

export function fileCategory(path: string): string | null {
  const lower = path.toLowerCase()
  const name = lower.split('/').pop() ?? lower
  if (/^readme(?:\.[a-z0-9]+)?$/.test(name) || /^docs?\/.*\.mdx?$/.test(lower)) return 'docs'
  if (
    /(^|\/)(package\.json|pyproject\.toml|requirements[^/]*\.txt|go\.mod|cargo\.toml|pom\.xml|build\.gradle|composer\.json|gemfile)$/.test(
      lower
    )
  )
    return 'manifest'
  if (
    /(^|\/)(schema\.prisma|drizzle\.config\.[^/]+|supabase\/migrations\/.*\.sql|migrations\/.*\.sql)$/.test(
      lower
    )
  )
    return 'schema'
  if (
    /(^|\/)(dockerfile|docker-compose[^/]*\.ya?ml|next\.config\.[^/]+|vite\.config\.[^/]+|tsconfig\.json|vercel\.json|\.github\/workflows\/.*\.ya?ml)$/.test(
      lower
    )
  )
    return 'config'
  if (
    /(^|\/)(api|routes?|controllers?|functions?|server|actions)(\/|\.|-)/.test(lower) ||
    /(^|\/)app\/api\//.test(lower)
  )
    return 'api'
  if (/(^|\/)(__tests__|tests?|spec)(\/|\.|-)/.test(lower) || /\.(test|spec)\.[jt]sx?$/.test(lower))
    return 'test'
  if (
    /\.(ts|tsx|js|jsx|py|go|rs|java|kt|rb|php|cs|swift)$/.test(lower) &&
    (/(^|\/)(src|app|lib|packages?|services?|components?)(\/|$)/.test(lower) ||
      /^(main|index|server|app|cli)\.(ts|tsx|js|jsx|py|go|rs|java|kt|rb|php|cs|swift)$/.test(
        lower
      ))
  )
    return 'source'
  return null
}

export function isImplementationFile(path: string): boolean {
  return ['api', 'schema', 'source', 'test'].includes(fileCategory(path) ?? '')
}

const CATEGORY_LIMITS: Record<string, number> = {
  docs: 3,
  manifest: 4,
  schema: 2,
  config: 3,
  api: 3,
  source: 5,
  test: 2,
}

const CATEGORY_SCORE: Record<string, number> = {
  manifest: 100,
  docs: 95,
  schema: 90,
  api: 85,
  config: 80,
  source: 65,
  test: 45,
}

export function selectRepositoryFiles(tree: GitHubTreeItem[]): GitHubTreeItem[] {
  const candidates = tree
    .filter(item => {
      if (item.type !== 'blob' || !item.path || !item.sha) return false
      if (item.size != null && item.size > MAX_FILE_BYTES) return false
      return !EXCLUDED_PATH.test(item.path) && !EXCLUDED_FILE.test(item.path)
    })
    .map(item => ({ item, category: fileCategory(item.path) }))
    .filter((entry): entry is { item: GitHubTreeItem; category: string } => Boolean(entry.category))
    .sort((a, b) => {
      const score = (CATEGORY_SCORE[b.category] ?? 0) - (CATEGORY_SCORE[a.category] ?? 0)
      if (score !== 0) return score
      const depth = a.item.path.split('/').length - b.item.path.split('/').length
      return depth || a.item.path.localeCompare(b.item.path)
    })

  const counts: Record<string, number> = {}
  const selected: GitHubTreeItem[] = []
  for (const candidate of candidates) {
    if (selected.length >= MAX_SELECTED_FILES) break
    const count = counts[candidate.category] ?? 0
    if (count >= (CATEGORY_LIMITS[candidate.category] ?? 1)) continue
    counts[candidate.category] = count + 1
    selected.push(candidate.item)
  }
  return selected
}

function decodeBlob(blob: GitHubBlob): string {
  if (!blob.content || blob.encoding !== 'base64') return ''
  return Buffer.from(blob.content.replace(/\n/g, ''), 'base64').toString('utf8')
}

function redactSecrets(text: string): string {
  return text.replace(SECRET_ASSIGNMENT, '$1[REDACTED]$3')
}

async function loadSelectedFiles(
  fullName: string,
  token: string,
  selected: GitHubTreeItem[]
): Promise<SelectedRepoFile[]> {
  const files: SelectedRepoFile[] = []
  let remaining = MAX_SOURCE_CHARS

  for (const item of selected) {
    if (remaining <= 0) break
    const blob = await githubFetch<GitHubBlob>(`/repos/${fullName}/git/blobs/${item.sha}`, token)
    const decoded = redactSecrets(decodeBlob(blob)).trim()
    if (!decoded) continue
    const content = decoded.slice(0, remaining)
    files.push({ path: item.path, content })
    remaining -= content.length
  }
  return files
}

export function formatRepositorySource(files: SelectedRepoFile[]): string {
  return files.map(file => `--- FILE: ${file.path} ---\n${file.content}`).join('\n\n')
}

export async function resolveRepositoryHead(
  fullName: string,
  token: string
): Promise<RepositoryHead> {
  const repo = await githubFetch<GitHubApiRepo>(`/repos/${fullName}`, token)
  const defaultBranch = repo.default_branch || 'main'
  const commit = await githubFetch<GitHubCommit>(
    `/repos/${fullName}/commits/${encodeURIComponent(defaultBranch)}`,
    token
  )
  return {
    repo,
    defaultBranch,
    commitSha: commit.sha,
    treeSha: commit.commit.tree.sha,
  }
}

export async function collectRepositorySource(
  fullName: string,
  token: string,
  resolvedHead?: RepositoryHead
): Promise<RepositorySourceSnapshot> {
  const head = resolvedHead ?? (await resolveRepositoryHead(fullName, token))
  const tree = await githubFetch<GitHubTree>(
    `/repos/${fullName}/git/trees/${head.treeSha}?recursive=1`,
    token
  )
  const blobs = tree.tree.filter(item => item.type === 'blob').slice(0, MAX_TREE_FILES)
  const selected = selectRepositoryFiles(blobs)
  const selectedFiles = await loadSelectedFiles(fullName, token, selected)

  return {
    repo: head.repo,
    defaultBranch: head.defaultBranch,
    commitSha: head.commitSha,
    treeFileCount: tree.tree.filter(item => item.type === 'blob').length,
    treeTruncated: tree.truncated || tree.tree.length > MAX_TREE_FILES,
    selectedFiles,
    sourceBundle: formatRepositorySource(selectedFiles),
  }
}
