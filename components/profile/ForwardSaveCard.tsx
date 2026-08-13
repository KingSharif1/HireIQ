'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Inbox, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SaveState = {
  forward_save_email: string | null
  domain: string | null
  configured?: boolean
}

/**
 * Forward a job posting email here → parsed URL lands in Applications.
 */
export function ForwardSaveCard() {
  const [state, setState] = useState<SaveState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/forward-save-email')
      const json = (await res.json()) as SaveState & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setState(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function ensureAddress() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/forward-save-email', { method: 'POST' })
      const json = (await res.json()) as SaveState & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Could not create address')
      setState(prev => ({ ...prev, ...json, configured: prev?.configured ?? true }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create address')
    } finally {
      setBusy(false)
    }
  }

  async function copyAddress() {
    if (!state?.forward_save_email) return
    try {
      await navigator.clipboard.writeText(state.forward_save_email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Could not copy')
    }
  }

  if (loading) {
    return (
      <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading save-by-email…
      </div>
    )
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-start gap-2 mb-3">
        <Inbox className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-foreground">Save jobs by email</h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-prose">
            Forward a posting to this address. HireIQ pulls the job link and adds it to Applications.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!state?.forward_save_email ? (
        <Button
          type="button"
          size="sm"
          onClick={() => void ensureAddress()}
          disabled={busy || state?.configured === false}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create save address'}
        </Button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input readOnly value={state.forward_save_email} className="font-mono text-sm" />
          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => void copyAddress()}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy
              </>
            )}
          </Button>
        </div>
      )}

      {state?.configured === false && (
        <p className="mt-3 text-xs text-muted-foreground">
          Server env not ready yet — add MASKED_EMAIL_DOMAIN and RESEND_API_KEY.
        </p>
      )}
    </div>
  )
}
