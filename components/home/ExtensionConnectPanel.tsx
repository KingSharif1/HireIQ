'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Loader2, Puzzle, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TokenMeta = {
  id: string
  label: string
  last_used_at: string | null
  created_at: string
}

export function ExtensionConnectPanel() {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(false)
  const [meta, setMeta] = useState<TokenMeta | null>(null)
  const [plaintext, setPlaintext] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/extension/token')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setConnected(Boolean(json.connected))
      setMeta(json.token ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createToken() {
    setBusy(true)
    setError(null)
    setCopied(false)
    try {
      const res = await fetch('/api/extension/token', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create token')
      setPlaintext(json.token as string)
      setConnected(true)
      setMeta({
        id: json.id,
        label: json.label,
        created_at: json.created_at,
        last_used_at: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create token')
    } finally {
      setBusy(false)
    }
  }

  async function revoke() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/extension/token', { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to revoke')
      setConnected(false)
      setMeta(null)
      setPlaintext(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke')
    } finally {
      setBusy(false)
    }
  }

  async function copyToken() {
    if (!plaintext) return
    await navigator.clipboard.writeText(plaintext)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section
      id="chrome-extension"
      className="mt-10 rounded-md border border-border bg-white dark:bg-card px-4 py-5 sm:px-5"
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Puzzle className="h-4 w-4 text-foreground/80" strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Chrome extension</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Click <strong>Connect HireIQ</strong> in the extension — it opens this site so you can
            sign in with Google or email. Optional legacy token below. Setup:{' '}
            <code className="text-xs">docs/EXTENSION.md</code>.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                connected
                  ? 'bg-brand-green/15 text-brand-green'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {connected ? 'Token active' : 'Not connected'}
            </span>
            {meta?.last_used_at && (
              <span className="text-xs text-muted-foreground">
                Last used {new Date(meta.last_used_at).toLocaleString()}
              </span>
            )}
          </div>

          {plaintext && (
            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">
                Copy this token now — it won&apos;t be shown again.
              </p>
              <code className="block text-xs break-all text-foreground font-mono">{plaintext}</code>
              <Button type="button" size="sm" variant="outline" onClick={() => void copyToken()}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy token'}
              </Button>
            </div>
          )}

          <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
            <li>
              Load unpacked from <code className="text-xs">extension/dist</code>.
            </li>
            <li>
              Extension popup → <strong>Connect HireIQ</strong> → sign in on this site (Google or
              email).
            </li>
            <li>On a job page use Autofill + Save. If the site needs an account, save that email in the panel.</li>
          </ol>

          <p className="text-xs text-muted-foreground">
            Advanced fallback: generate a one-time <code className="text-xs">hiq_</code> token if
            Google sign-in is unavailable.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void createToken()}>
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : connected ? (
                <RefreshCw className="w-3.5 h-3.5" />
              ) : (
                <Puzzle className="w-3.5 h-3.5" />
              )}
              {connected ? 'Regenerate token' : 'Generate token'}
            </Button>
            {connected && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void revoke()}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Revoke
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
