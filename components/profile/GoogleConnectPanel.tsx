'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2, Mail, RefreshCw, Unlink } from 'lucide-react'
import { mapGoogleConnectError } from '@/lib/google/oauth'
import type { GoogleConnectionStatus } from '@/lib/google/types'

function formatSynced(iso: string | null | undefined): string {
  if (!iso) return 'Never synced'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString()
}

export function GoogleConnectPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<GoogleConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'connect' | 'disconnect' | 'toggle' | 'sync' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    const gError = searchParams.get('google_error')
    const msg = mapGoogleConnectError(gError)
    if (msg) {
      setError(msg)
      router.replace('/dashboard/settings', { scroll: false })
    }
  }, [searchParams, router])

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/google/status')
      const json = (await res.json()) as GoogleConnectionStatus & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Failed to load Gmail status')
      setStatus(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setStatus({ connected: false, gmailSyncEnabled: true, configured: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  function handleConnect() {
    setBusy('connect')
    setError(null)
    setInfo(null)
    window.location.href = '/api/google/connect'
  }

  async function handleSync() {
    setBusy('sync')
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/google/sync', { method: 'POST' })
      const json = (await res.json()) as {
        error?: string
        result?: { scanned: number; matched: number; linked: number; duplicates: number }
      }
      if (!res.ok) throw new Error(json.error || 'Sync failed')
      await loadStatus()
      const r = json.result
      if (r) {
        setInfo(`Synced ${r.scanned} messages · ${r.matched} matched · ${r.duplicates} already stored`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(null)
    }
  }

  async function handleDisconnect() {
    setBusy('disconnect')
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/google/disconnect', { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Disconnect failed')
      }
      await loadStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setBusy(null)
    }
  }

  async function handleToggle(enabled: boolean) {
    setBusy('toggle')
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/google/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmailSyncEnabled: enabled }),
      })
      const json = (await res.json()) as GoogleConnectionStatus & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Could not update preference')
      setStatus(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update preference')
    } finally {
      setBusy(null)
    }
  }

  const connected = status?.connected === true
  const syncOn = status?.gmailSyncEnabled !== false

  return (
    <div className="mb-6 rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">Gmail tracking</h3>
              {connected && (
                <Badge variant="muted" className="text-[10px]">
                  {status.email}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {connected
                ? `Read-only employer mail match · Last sync ${formatSynced(status.syncedAt)}`
                : 'Connect Google for read-only Gmail sync. Email/password accounts can still use the application email below.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!connected ? (
            <Button size="sm" onClick={handleConnect} disabled={busy !== null || loading}>
              {busy === 'connect' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect Gmail'}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={busy !== null || loading || !syncOn}
              >
                {busy === 'sync' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync now
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

      {connected && (
        <label className="mt-3 flex items-start gap-3 rounded-lg border border-border bg-background/60 px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={syncOn}
            disabled={busy !== null || loading}
            onChange={e => handleToggle(e.target.checked)}
            aria-label="Sync employer mail from Gmail"
          />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-foreground">Sync employer mail</span>
            <span className="block text-[11px] text-muted-foreground">
              Off = stop scanning Gmail. Masked apply address still works.
            </span>
          </span>
        </label>
      )}

      {info && <p className="mt-3 text-xs text-muted-foreground">{info}</p>}
      {error && <p className={cn('mt-3 text-xs text-destructive')}>{error}</p>}
    </div>
  )
}
