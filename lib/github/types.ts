export type GitHubRepoStatus = 'active' | 'stale' | 'archived'

export interface GitHubRepoSnapshot {
  id: number
  name: string
  fullName: string
  htmlUrl: string
  description: string | null
  languages: string[]
  stars: number
  pushedAt: string
  status: GitHubRepoStatus
  topics: string[]
  isFork: boolean
  isPrivate: boolean
}

export interface GitHubProfileData {
  username: string
  profileUrl: string
  avatarUrl: string | null
  syncedAt: string
  repos: GitHubRepoSnapshot[]
}

export interface GitHubConnectionRow {
  user_id: string
  github_username: string
  access_token: string
  token_scopes: string | null
  connected_at: string
  synced_at: string | null
}

/** Raw GitHub API shapes (subset we use). */
export interface GitHubApiUser {
  login: string
  html_url: string
  avatar_url: string
}

export interface GitHubApiRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  stargazers_count: number
  pushed_at: string
  archived: boolean
  fork: boolean
  private: boolean
  topics?: string[]
}
