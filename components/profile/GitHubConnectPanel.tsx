'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Code2, ExternalLink, Loader2, RefreshCw, Unlink } from 'lucide-react'
import type { GitHubProfileData } from '@/lib/github/types'
import { mapGitHubConnectError } from '@/lib/github/oauth'

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
  onSynced?: () => void
}

function formatSynced(iso: string | null): string {
  if (!iso) return 'Never synced'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString()
}

export function GitHubConnectPanel({ initialGithubData, onSynced }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<GitHubStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'connect' | 'sync' | 'disconnect' | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load GitHub status')
      setStatus(json)
    } catch (e) {
      if (!error) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      }
      if (initialGithubData) {
        setStatus({
          connected: true,
          username: initialGithubData.username,
          profileUrl: initialGithubData.profileUrl,
          syncedAt: initialGithubData.syncedAt,
          repoCount: initialGithubData.repos.length,
          activeRepos: initialGithubData.repos.filter(r => r.status === 'active').length,
        })
      } else {
        setStatus({ connected: false })
      }
    } finally {
      setLoading(false)
    }
  }, [initialGithubData])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  function handleConnect() {
    setBusy('connect')
    setError(null)
    window.location.href = '/api/github/connect'
  }

  async function handleSync() {
    setBusy('sync')
    setError(null)
    try {
      const res = await fetch('/api/github/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Sync failed')
      setStatus(json)
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
        const json = await res.json()
        throw new Error(json.error || 'Disconnect failed')
      }
      setStatus({ connected: false })
      onSynced?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setBusy(null)
    }
  }

  const connected = status?.connected === true

  return (
    <div className="mb-6 rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0">
            <Code2 className="w-5 h-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">GitHub</h3>
              {connected && (
                <Badge variant="muted" className="text-[10px]">
                  @{status.username}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {connected
                ? `Synced ${formatSynced(status.syncedAt)} · ${status.repoCount} repos (${status.activeRepos} active)`
                : 'Connect to pull repo metadata and suggest profile projects from your real work.'}
            </p>
            {connected && status.profileUrl && (
              <a
                href={status.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                View on GitHub <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!connected ? (
            <Button size="sm" onClick={handleConnect} disabled={busy !== null || loading}>
              {busy === 'connect' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect GitHub'}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={busy !== null || loading}
              >
                {busy === 'sync' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={handleDisconnect}
                disabled={busy !== null || loading}
              >
                {busy === 'disconnect' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className={cn('mt-3 text-xs text-destructive')}>{error}</p>
      )}
    </div>
  )
}
