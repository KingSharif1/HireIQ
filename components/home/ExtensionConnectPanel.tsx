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
  const [showLegacy, setShowLegacy] = useState(false)

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
      className="mt-8 scroll-mt-8 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
    >
      <div className="border-b border-border/70 bg-gradient-to-r from-teal-500/10 via-transparent to-transparent px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600/15 text-teal-800 dark:text-teal-200">
            <Puzzle className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-foreground">Chrome extension</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Install the extension, then click <strong className="font-medium text-foreground">Connect HireIQ</strong> in
              the popup. If you&apos;re already signed in here, it links in one step — no second login.
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 space-y-4">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1.5">
          <li>Install from the Chrome Web Store (or load unpacked while testing).</li>
          <li>
            Open the HireIQ popup → <strong className="text-foreground">Connect HireIQ</strong>.
          </li>
          <li>You&apos;ll see Connected in the popup — then Autofill / Save on job pages.</li>
        </ol>

        <p className="text-xs text-muted-foreground">
          Connection status lives in the extension popup (Connected / Not connected). This page does not need a
          separate link button for the normal flow.
        </p>

        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => setShowLegacy(v => !v)}
        >
          {showLegacy ? 'Hide legacy token' : 'Legacy token (optional)'}
        </button>

        {showLegacy && (
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Only if Connect HireIQ is unavailable. Paste the token under Advanced in a local/dev extension build.
            </p>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      connected
                        ? 'bg-teal-500/15 text-teal-800 dark:text-teal-200'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {connected ? 'Token active' : 'No legacy token'}
                  </span>
                  {meta?.last_used_at && (
                    <span className="text-xs text-muted-foreground">
                      Last used {new Date(meta.last_used_at).toLocaleString()}
                    </span>
                  )}
                </div>

                {plaintext && (
                  <div className="rounded-lg border border-teal-500/25 bg-teal-500/5 p-3 space-y-2">
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
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
