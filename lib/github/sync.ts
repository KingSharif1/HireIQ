import type { SupabaseClient } from '@supabase/supabase-js'
import type { GitHubConnectionRow, GitHubProfileData } from './types'
import { fetchGitHubUser, fetchUserRepos, snapshotRepos } from './client'
import {
  ensureGitHubUrl,
  githubSuggestionsFromRepos,
  linkProjectGithubUrls,
} from './suggestions'
import { mergeGitHubPendingSuggestions, normalizeProfileData } from '@/lib/profile/provenance'
import type { Profile, ProfileData } from '@/types'

export async function getGitHubConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<GitHubConnectionRow | null> {
  const { data } = await supabase
    .from('github_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<GitHubConnectionRow>()
  return data ?? null
}

export async function saveGitHubConnection(
  supabase: SupabaseClient,
  userId: string,
  token: string,
  username: string,
  scopes?: string | null
): Promise<void> {
  const { error } = await supabase.from('github_connections').upsert({
    user_id: userId,
    github_username: username,
    access_token: token,
    token_scopes: scopes ?? null,
    connected_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function disconnectGitHubAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase.from('github_connections').delete().eq('user_id', userId)
  await supabase
    .from('profiles')
    .update({ github_data: null, updated_at: new Date().toISOString() })
    .eq('id', userId)
}

export interface SyncGitHubResult {
  githubData: GitHubProfileData
  profileData: ProfileData
  suggestionsAdded: number
}

export async function syncGitHubForUser(
  supabase: SupabaseClient,
  userId: string,
  tokenOverride?: string
): Promise<SyncGitHubResult> {
  const connection = await getGitHubConnection(supabase, userId)
  const token = tokenOverride ?? connection?.access_token
  if (!token) throw new Error('GitHub not connected')

  const [ghUser, rawRepos] = await Promise.all([
    fetchGitHubUser(token),
    fetchUserRepos(token),
  ])
  const repos = await snapshotRepos(rawRepos, token)
  const syncedAt = new Date().toISOString()

  const githubData: GitHubProfileData = {
    username: ghUser.login,
    profileUrl: ghUser.html_url,
    avatarUrl: ghUser.avatar_url,
    syncedAt,
    repos,
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('profile_data, github_data')
    .eq('id', userId)
    .single<Pick<Profile, 'profile_data' | 'github_data'>>()

  let profileData = normalizeProfileData(profileRow?.profile_data ?? ({} as ProfileData))
  profileData = ensureGitHubUrl(profileData, ghUser.login, ghUser.html_url)
  profileData = {
    ...profileData,
    projects: linkProjectGithubUrls(profileData.projects, repos),
  }

  const incoming = githubSuggestionsFromRepos(repos, profileData)
  const mergedPending = mergeGitHubPendingSuggestions(profileData.pendingSuggestions ?? [], incoming)
  profileData = { ...profileData, pendingSuggestions: mergedPending }

  await supabase.from('github_connections').upsert({
    user_id: userId,
    github_username: ghUser.login,
    access_token: token,
    synced_at: syncedAt,
  })

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      github_data: githubData,
      profile_data: profileData,
      updated_at: syncedAt,
    })
    .eq('id', userId)

  if (profileError) throw new Error(profileError.message)

  return {
    githubData,
    profileData,
    suggestionsAdded: incoming.length,
  }
}

export function publicGitHubStatus(
  githubData: GitHubProfileData | null | undefined,
  username?: string | null,
  syncedAt?: string | null
) {
  if (!githubData && !username) return { connected: false as const }
  return {
    connected: true as const,
    username: githubData?.username ?? username ?? '',
    profileUrl: githubData?.profileUrl ?? (username ? `https://github.com/${username}` : ''),
    syncedAt: githubData?.syncedAt ?? syncedAt ?? null,
    repoCount: githubData?.repos?.length ?? 0,
    activeRepos: githubData?.repos?.filter(r => r.status === 'active').length ?? 0,
  }
}
