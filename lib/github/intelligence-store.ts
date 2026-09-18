import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  RepoIntelligence,
  RepoIntelligenceRecord,
  RepoIntelligenceStatus,
} from './types'

interface RepoIntelligenceRow {
  id: string
  repo_id: number | string
  full_name: string
  default_branch: string
  commit_sha: string
  repo_pushed_at: string | null
  status: RepoIntelligenceStatus
  intelligence: RepoIntelligence | null
  tree_file_count: number
  analyzed_file_count: number
  tree_truncated: boolean
  error: string | null
  updated_at: string
}

function toRecord(row: RepoIntelligenceRow): RepoIntelligenceRecord {
  return {
    id: row.id,
    repoId: Number(row.repo_id),
    fullName: row.full_name,
    defaultBranch: row.default_branch,
    commitSha: row.commit_sha,
    repoPushedAt: row.repo_pushed_at,
    status: row.status,
    intelligence: row.status === 'ready' ? row.intelligence : null,
    treeFileCount: row.tree_file_count,
    analyzedFileCount: row.analyzed_file_count,
    treeTruncated: row.tree_truncated,
    error: row.error,
    updatedAt: row.updated_at,
  }
}

export async function loadLatestReadyIntelligence(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<number, RepoIntelligenceRecord>> {
  const { data, error } = await supabase
    .from('repo_intelligence')
    .select(
      'id, repo_id, full_name, default_branch, commit_sha, repo_pushed_at, status, intelligence, tree_file_count, analyzed_file_count, tree_truncated, error, updated_at'
    )
    .eq('user_id', userId)
    .eq('status', 'ready')
    .order('updated_at', { ascending: false })

  if (error) {
    // Migration may not be applied yet. Preserve the existing Profile experience.
    if (/repo_intelligence|schema cache|does not exist/i.test(error.message)) return {}
    throw new Error(error.message)
  }

  const latest: Record<number, RepoIntelligenceRecord> = {}
  for (const raw of (data ?? []) as RepoIntelligenceRow[]) {
    const row = toRecord(raw)
    if (!latest[row.repoId]) latest[row.repoId] = row
  }
  return latest
}

export async function findIntelligenceByCommit(
  supabase: SupabaseClient,
  userId: string,
  repoId: number,
  commitSha: string
): Promise<RepoIntelligenceRecord | null> {
  const { data, error } = await supabase
    .from('repo_intelligence')
    .select(
      'id, repo_id, full_name, default_branch, commit_sha, repo_pushed_at, status, intelligence, tree_file_count, analyzed_file_count, tree_truncated, error, updated_at'
    )
    .eq('user_id', userId)
    .eq('repo_id', repoId)
    .eq('commit_sha', commitSha)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? toRecord(data as RepoIntelligenceRow) : null
}

export function isIntelligenceStale(
  record: RepoIntelligenceRecord | null | undefined,
  repoPushedAt: string
): boolean {
  if (!record?.repoPushedAt) return false
  const scanned = Date.parse(record.repoPushedAt)
  const current = Date.parse(repoPushedAt)
  return Number.isFinite(scanned) && Number.isFinite(current) && current > scanned
}
