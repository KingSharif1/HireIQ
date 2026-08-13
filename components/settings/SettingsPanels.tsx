'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Loader2, Mail, RefreshCw, Shield, Unlink } from 'lucide-react'
import { mapGoogleConnectError } from '@/lib/google/oauth'
import { GitHubConnectPanel } from '@/components/profile/GitHubConnectPanel'
import { MaskedEmailCard } from '@/components/profile/MaskedEmailCard'

type TrackingMode = 'gmail' | 'masked' | 'off'

type TrackingStatus = {
  mode: TrackingMode
  gmailConnected: boolean
  gmailEmail: string | null
  gmailSyncedAt: string | null
  maskedEmail: string | null
  accountEmail: string | null
}

const MODES: { id: TrackingMode; title: string; body: string }[] = [
  {
    id: 'gmail',
    title: 'Gmail',
    body: 'Read-only sync of employer emails. Default when you sign in with Google.',
  },
  {
    id: 'masked',
    title: 'Application email',
    body: 'Use a HireIQ address on applications. Employer replies land in your tracker.',
  },
  {
    id: 'off',
    title: 'Off',
    body: 'You track status yourself. Email inbox is hidden on jobs.',
  },
]

export function SettingsIntegrations() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<TrackingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile/email-tracking')
      const json = (await res.json()) as TrackingStatus & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setStatus(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function setMode(mode: TrackingMode) {
    setBusy(mode)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'gmail' && !status?.gmailConnected) {
        window.location.href = '/api/google/connect'
        return
      }
      if (mode === 'masked' && !status?.maskedEmail) {
        const create = await fetch('/api/profile/masked-email', { method: 'POST' })
        const created = await create.json()
        if (!create.ok) throw new Error(created.error || 'Could not create application email')
      }
      const res = await fetch('/api/profile/email-tracking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const json = (await res.json()) as TrackingStatus & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Could not update')
      setStatus(json)
      setInfo(
        mode === 'off'
          ? 'Email tracking off — job Email tabs are hidden.'
          : `Tracking via ${mode === 'gmail' ? 'Gmail' : 'application email'}.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update')
    } finally {
      setBusy(null)
    }
  }

  async function syncGmail() {
    setBusy('sync')
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/google/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Sync failed')
      const r = json.result as { scanned: number; matched: number; duplicates: number }
      setInfo(`Synced ${r.scanned} · ${r.matched} matched · ${r.duplicates} already stored`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(null)
    }
  }

  async function disconnectGmail() {
    setBusy('disconnect')
    setError(null)
    try {
      const res = await fetch('/api/google/disconnect', { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Disconnect failed')
      }
      await fetch('/api/profile/email-tracking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: status?.maskedEmail ? 'masked' : 'off' }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setBusy(null)
    }
  }

  const mode = status?.mode ?? 'gmail'

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4" /> Job email tracking
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Pick one way to track employer status emails — or turn tracking off.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Job email tracking mode"
          className="rounded-2xl border border-border bg-secondary/20 p-1.5 grid gap-1 sm:grid-cols-3"
        >
          {MODES.map(m => {
            const selected = mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={loading || busy !== null}
                onClick={() => void setMode(m.id)}
                className={cn(
                  'relative rounded-xl px-3 py-3 text-left transition-all',
                  selected
                    ? 'bg-background shadow-sm ring-1 ring-border'
                    : 'hover:bg-background/50 text-muted-foreground',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      selected ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {m.title}
                  </span>
                  <span
                    className={cn(
                      'h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0',
                      selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                    )}
                    aria-hidden
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{m.body}</p>
                {busy === m.id && (
                  <Loader2 className="absolute top-3 right-8 w-3.5 h-3.5 animate-spin text-muted-foreground" />
                )}
              </button>
            )
          })}
        </div>

        {mode === 'gmail' && (
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Gmail connection</p>
                  <p className="text-xs text-muted-foreground">
                    {status?.gmailConnected
                      ? `${status.gmailEmail ?? 'Connected'} · read-only`
                      : 'Not connected — we need Gmail access to sync employer mail.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {status?.gmailConnected ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => void syncGmail()} disabled={busy !== null}>
                      {busy === 'sync' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Sync
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void disconnectGmail()} disabled={busy !== null}>
                      {busy === 'disconnect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => { window.location.href = '/api/google/connect' }}>
                    Connect Gmail
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === 'masked' && <MaskedEmailCard />}

        {info && <p className="text-xs text-muted-foreground">{info}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Connected apps</h2>
          <p className="text-xs text-muted-foreground mt-1">
            GitHub powers project suggestions on your profile. Manage sync here.
          </p>
        </div>
        <GitHubConnectPanel initialGithubData={null} onSynced={() => router.refresh()} />
      </section>
    </div>
  )
}

export function SettingsAccount() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (password.length < 8) {
      setErr('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setErr('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not update password')
      setMsg('Password updated.')
      setPassword('')
      setConfirm('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update password')
    } finally {
      setBusy(false)
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'DELETE') {
      setErr('Type DELETE to confirm.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not delete account')
      window.location.href = '/login'
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete account')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Password</h2>
        <p className="text-xs text-muted-foreground">
          For email/password accounts. Google-only accounts can set a password as a backup sign-in.
        </p>
        <form onSubmit={changePassword} className="space-y-3 max-w-sm">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
          </Button>
        </form>
      </section>

      <section className="space-y-3 rounded-xl border border-destructive/30 p-4">
        <h2 className="text-sm font-semibold text-destructive">Delete account</h2>
        <p className="text-xs text-muted-foreground">
          Permanently deletes your HireIQ account, profile, and application data. This cannot be undone.
        </p>
        <Input
          placeholder='Type DELETE to confirm'
          value={deleteConfirm}
          onChange={e => setDeleteConfirm(e.target.value)}
          className="max-w-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/40"
          disabled={busy}
          onClick={() => void deleteAccount()}
        >
          Delete my account
        </Button>
      </section>

      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  )
}
