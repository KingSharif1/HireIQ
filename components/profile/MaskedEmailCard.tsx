'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/profile/primitives'

type MaskedState = {
  masked_email: string | null
  email_forward_to: string | null
  email_forward_enabled: boolean
  domain: string | null
  configured?: boolean
}

/**
 * Sprout-style application email — copy when applying; employer mail → All outreach.
 */
export function MaskedEmailCard() {
  const [state, setState] = useState<MaskedState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forwardDraft, setForwardDraft] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/masked-email')
      const json = (await res.json()) as MaskedState & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setState(json)
      setForwardDraft(json.email_forward_to ?? '')
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
      const res = await fetch('/api/profile/masked-email', { method: 'POST' })
      const json = (await res.json()) as MaskedState & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Could not create address')
      setState(prev => ({ ...prev, ...json, configured: prev?.configured ?? true }))
      setForwardDraft(json.email_forward_to ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create address')
    } finally {
      setBusy(false)
    }
  }

  async function copyAddress() {
    if (!state?.masked_email) return
    try {
      await navigator.clipboard.writeText(state.masked_email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Could not copy')
    }
  }

  async function saveForward() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/masked-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_forward_to: forwardDraft.trim() || null,
          email_forward_enabled: state?.email_forward_enabled ?? true,
        }),
      })
      const json = (await res.json()) as MaskedState & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Save failed')
      setState(prev => ({ ...prev, ...json, configured: prev?.configured ?? true }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleForward(enabled: boolean) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/masked-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_forward_enabled: enabled }),
      })
      const json = (await res.json()) as MaskedState & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Save failed')
      setState(prev => ({ ...prev, ...json, configured: prev?.configured ?? true }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading application email…
      </div>
    )
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-start gap-2 mb-3">
        <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-foreground">Application email</h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-prose">
            Use this address when you apply. Employer replies land in Applications → All outreach
            (and the job Email tab when we can match the company). Reply from the job Email tab —
            HireIQ sends as this address so the employer never sees your personal inbox.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!state?.masked_email ? (
        <Button type="button" size="sm" onClick={() => void ensureAddress()} disabled={busy || state?.configured === false}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create application email'}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={state.masked_email} className="font-mono text-sm" />
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

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="rounded border-border"
              checked={state.email_forward_enabled}
              disabled={busy}
              onChange={e => void toggleForward(e.target.checked)}
            />
            Forward a copy to my inbox
          </label>

          {state.email_forward_enabled && (
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 w-full">
                <Field label="Forward to">
                  <Input
                    type="email"
                    value={forwardDraft}
                    onChange={e => setForwardDraft(e.target.value)}
                    placeholder="you@gmail.com"
                  />
                </Field>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 mb-0.5"
                disabled={busy || forwardDraft === (state.email_forward_to ?? '')}
                onClick={() => void saveForward()}
              >
                Save
              </Button>
            </div>
          )}
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
