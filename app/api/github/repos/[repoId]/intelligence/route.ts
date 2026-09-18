import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGitHubConnection } from '@/lib/github/sync'
import { collectRepositorySource, resolveRepositoryHead } from '@/lib/github/deep-scan'
import { analyzeRepository } from '@/lib/github/analyze-repo'
import { findIntelligenceByCommit } from '@/lib/github/intelligence-store'
import { AiConfigError } from '@/lib/ai/runtime'
import type { GitHubProfileData } from '@/lib/github/types'
import type { Profile } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(
  request: Request,
  context: { params: Promise<{ repoId: string }> }
) {
  const body = await request.json().catch(() => ({}))
  const force = Boolean(
    body && typeof body === 'object' && 'force' in body && body.force === true
  )
  const { repoId: rawRepoId } = await context.params
  const repoId = Number(rawRepoId)
  if (!Number.isSafeInteger(repoId) || repoId <= 0) {
    return NextResponse.json({ error: 'Invalid repository.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [connection, profileRes] = await Promise.all([
    getGitHubConnection(supabase, user.id),
    supabase
      .from('profiles')
      .select('github_data')
      .eq('id', user.id)
      .maybeSingle<Pick<Profile, 'github_data'>>(),
  ])
  if (!connection) {
    return NextResponse.json({ error: 'Connect GitHub before analyzing a repository.' }, { status: 400 })
  }

  const githubData = profileRes.data?.github_data as GitHubProfileData | null
  const repo = githubData?.repos?.find(candidate => candidate.id === repoId)
  if (!repo) {
    return NextResponse.json(
      { error: 'Sync GitHub again, then choose a repository from your synced list.' },
      { status: 404 }
    )
  }

  let commitSha = ''
  try {
    const head = await resolveRepositoryHead(repo.fullName, connection.access_token)
    commitSha = head.commitSha
    const cached = await findIntelligenceByCommit(supabase, user.id, repoId, commitSha)
    if (cached?.status === 'ready' && !force) {
      return NextResponse.json({ cached: true, record: cached })
    }
    if (cached?.status === 'scanning') {
      const age = Date.now() - Date.parse(cached.updatedAt)
      if (Number.isFinite(age) && age < 5 * 60_000) {
        return NextResponse.json(
          { error: 'This repository is already being analyzed.' },
          { status: 409 }
        )
      }
    }

    const now = new Date().toISOString()
    const { error: startError } = await supabase.from('repo_intelligence').upsert(
      {
        user_id: user.id,
        repo_id: repoId,
        full_name: repo.fullName,
        default_branch: head.defaultBranch,
        commit_sha: commitSha,
        repo_pushed_at: head.repo.pushed_at,
        status: 'scanning',
        intelligence: {},
        tree_file_count: 0,
        analyzed_file_count: 0,
        tree_truncated: false,
        error: null,
        started_at: now,
        finished_at: null,
        updated_at: now,
      },
      { onConflict: 'user_id,repo_id,commit_sha' }
    )
    if (startError) throw new Error(startError.message)

    const source = await collectRepositorySource(repo.fullName, connection.access_token, head)
    const intelligence = await analyzeRepository(user.id, source)
    const finishedAt = new Date().toISOString()
    const { error: saveError } = await supabase
      .from('repo_intelligence')
      .update({
        status: 'ready',
        intelligence,
        tree_file_count: source.treeFileCount,
        analyzed_file_count: source.selectedFiles.length,
        tree_truncated: source.treeTruncated,
        error: null,
        finished_at: finishedAt,
        updated_at: finishedAt,
      })
      .eq('user_id', user.id)
      .eq('repo_id', repoId)
      .eq('commit_sha', commitSha)
    if (saveError) throw new Error(saveError.message)

    const record = await findIntelligenceByCommit(supabase, user.id, repoId, commitSha)
    if (!record) throw new Error('Repository analysis was saved but could not be reloaded.')
    return NextResponse.json({ cached: false, record })
  } catch (error) {
    const rawMessage =
      error instanceof AiConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Repository analysis failed.'
    const message = /repo_intelligence|schema cache|does not exist/i.test(rawMessage)
      ? 'Repository analysis storage is not set up yet. Apply migration 024 and try again.'
      : rawMessage
    if (commitSha) {
      const finishedAt = new Date().toISOString()
      await supabase
        .from('repo_intelligence')
        .update({
          status: 'failed',
          error: message.slice(0, 500),
          finished_at: finishedAt,
          updated_at: finishedAt,
        })
        .eq('user_id', user.id)
        .eq('repo_id', repoId)
        .eq('commit_sha', commitSha)
    }
    return NextResponse.json(
      { error: message },
      { status: error instanceof AiConfigError ? error.status : 502 }
    )
  }
}
