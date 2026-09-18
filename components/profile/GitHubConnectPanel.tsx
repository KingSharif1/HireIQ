'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Code2, ExternalLink, Loader2, Plus, RefreshCw, Unlink } from 'lucide-react'
import { GitHubRepoPicker } from './GitHubRepoPicker'
import { mapGitHubConnectError } from '@/lib/github/oauth'
import { planRepoAdd, projectFromRepo } from '@/lib/github/scan-project'
import { uid } from '@/lib/profile/data'
import { focusNewEntry } from '@/lib/profile/focus-entry'
import type { GitHubProfileData, GitHubRepoSnapshot } from '@/lib/github/types'
import type { ResumeProject } from '@/types'

type GitHubStatus =
  | { connected: false }
  | {
      connected: true
      username: string
      profileUrl: string
      syncedAt: string | null
      repoCount: number
      activeRepos: number
    }

interface Props {
  initialGithubData: GitHubProfileData | null
  existing?: ResumeProject[]
  onSynced?: () => void
  onAddProject?: (project: ResumeProject) => void
  onLinkProject?: (projectId: string, githubUrl: string) => void
  /** When false, hide the in-panel “Add from GitHub” flow (Settings). */
  showAddProject?: boolean
}

function formatSynced(iso: string | null): string {
  if (!iso) return 'Never synced'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(
      res.ok
        ? 'GitHub returned an unexpected response. Try Sync again.'
        : `GitHub request failed (${res.status}). Try reconnecting.`
    )
  }
}

export function GitHubConnectPanel({
  initialGithubData,
  existing = [],
  onSynced,
  onAddProject,
  onLinkProject,
  showAddProject = true,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<GitHubStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'connect' | 'sync' | 'disconnect' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickedUrl, setPickedUrl] = useState('')
  const [pendingLink, setPendingLink] = useState<{
    repo: GitHubRepoSnapshot
    project: ResumeProject
    reason: string
  } | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const repos = initialGithubData?.repos ?? []
  const username = status?.connected ? status.username : initialGithubData?.username

  useEffect(() => {
    const ghError = searchParams.get('github_error')
    const msg = mapGitHubConnectError(ghError)
    if (msg) {
      setError(msg)
      router.replace('/dashboard/profile?section=projects', { scroll: false })
    }
  }, [searchParams, router])

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/github/sync')
      const json = await readJson(res)
      if (!res.ok) throw new Error(String(json.error || 'Failed to load GitHub status'))
      setStatus(json as unknown as GitHubStatus)
      setError(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load'
      if (initialGithubData) {
        const list = initialGithubData.repos ?? []
        setStatus({
          connected: true,
          username: initialGithubData.username,
          profileUrl: initialGithubData.profileUrl,
          syncedAt: initialGithubData.syncedAt,
          repoCount: list.length,
          activeRepos: list.filter(r => r.status === 'active').length,
        })
        setError(null)
      } else {
        setStatus({ connected: false })
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }, [initialGithubData])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const unused = useMemo(() => {
    return repos.filter(repo => {
      const plan = planRepoAdd(repo, existing, username)
      return plan.action === 'create' || plan.action === 'ask-link' || plan.action === 'skip-thin'
    })
  }, [repos, existing, username])

  function handleConnect() {
    setBusy('connect')
    setError(null)
    window.location.href = '/api/github/connect'
  }

  async function handleSync() {
    setBusy('sync')
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/github/sync', { method: 'POST' })
      const json = await readJson(res)
      if (!res.ok) throw new Error(String(json.error || 'Sync failed'))
      setStatus(json as unknown as GitHubStatus)
      onSynced?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(null)
    }
  }

  async function handleDisconnect() {
    setBusy('disconnect')
    setError(null)
    try {
      const res = await fetch('/api/github/disconnect', { method: 'DELETE' })
      if (!res.ok) {
        const json = await readJson(res)
        throw new Error(String(json.error || 'Disconnect failed'))
      }
      setStatus({ connected: false })
      onSynced?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setBusy(null)
    }
  }

  function applyRepo(url: string) {
    const match = repos.find(r => r.htmlUrl === url)
    if (!match) return
    setInfo(null)
    setPendingLink(null)
    const plan = planRepoAdd(match, existing, username)

    if (plan.action === 'already-linked') {
      setInfo(`Already linked on “${plan.project.name || 'a project'}”.`)
      setPickedUrl('')
      setPickerOpen(false)
      return
    }
    if (plan.action === 'ask-link') {
      setPendingLink({ repo: match, project: plan.project, reason: plan.reason })
      return
    }
    if (plan.action === 'skip-thin') {
      setInfo(plan.reason)
      return
    }

    const project = projectFromRepo(match, uid('proj'))
    onAddProject?.(project)
    focusNewEntry(project.id)
    setPickedUrl('')
    setPickerOpen(false)
  }

  function confirmLink() {
    if (!pendingLink || !onLinkProject) return
    onLinkProject(pendingLink.project.id, pendingLink.repo.htmlUrl)
    focusNewEntry(pendingLink.project.id)
    setInfo(`Linked ${pendingLink.repo.fullName} to “${pendingLink.project.name}”.`)
    setPendingLink(null)
    setPickedUrl('')
    setPickerOpen(false)
  }

  function addAsNewAnyway() {
    if (!pendingLink || !onAddProject) return
    const project = projectFromRepo(pendingLink.repo, uid('proj'))
    onAddProject(project)
    focusNewEntry(project.id)
    setPendingLink(null)
    setPickedUrl('')
    setPickerOpen(false)
  }

  const connected = status?.connected === true

  return (
    <div className="mb-6 rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-background">
            <Code2 className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">GitHub</h3>
              {connected ? (
                <Badge variant="muted" className="text-[10px]">
                  @{status.username}
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {connected
                ? `Synced ${formatSynced(status.syncedAt)} · ${status.repoCount} repos (${status.activeRepos} active)`
                : 'Connect to pull repos, link them to projects, and analyze real code.'}
            </p>
            {connected && status.profileUrl ? (
              <a
                href={status.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View on GitHub <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {!connected ? (
            <Button size="sm" onClick={handleConnect} disabled={busy !== null || loading}>
              {busy === 'connect' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect GitHub'}
            </Button>
          ) : (
            <>
              {showAddProject && onAddProject && onLinkProject ? (
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setPickerOpen(o => !o)
                    setPendingLink(null)
                    setInfo(null)
                  }}
                  disabled={busy !== null || loading || repos.length === 0}
                >
                  <Plus className="h-4 w-4" />
                  {pickerOpen ? 'Cancel' : 'Add from GitHub'}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleSync()}
                disabled={busy !== null || loading}
              >
                {busy === 'sync' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => void handleDisconnect()}
                disabled={busy !== null || loading}
              >
                {busy === 'disconnect' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {connected && showAddProject && onAddProject && onLinkProject && pickerOpen ? (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Pick a repo. If it already matches a project (or is just a profile README), we’ll ask
            before creating a duplicate.
          </p>
          {unused.length === 0 ? (
            <p className="text-xs text-muted-foreground">Every synced repo is already on your profile.</p>
          ) : (
            <>
              <GitHubRepoPicker
                repos={unused}
                value={pickedUrl}
                allowNone={false}
                allowCustom={false}
                placeholder="Select a repo"
                onChange={url => {
                  setPickedUrl(url)
                  setPendingLink(null)
                  setInfo(null)
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {unused.length} repo{unused.length === 1 ? '' : 's'} available
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={!pickedUrl}
                  onClick={() => applyRepo(pickedUrl)}
                >
                  Continue
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {pendingLink ? (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-background p-3">
          <p className="text-sm text-foreground">{pendingLink.reason}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={confirmLink}>
              Link to {pendingLink.project.name || 'project'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={addAsNewAnyway}>
              Add as new project
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setPendingLink(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {info ? <p className="mt-3 text-xs text-muted-foreground">{info}</p> : null}
      {error ? <p className={cn('mt-3 text-xs text-destructive')}>{error}</p> : null}
    </div>
  )
}
