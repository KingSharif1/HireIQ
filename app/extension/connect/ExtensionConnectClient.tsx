'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, Puzzle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const EXT_MESSAGE_TYPE = 'HIREIQ_CONNECT_CODE'

export function ExtensionConnectClient() {
  const searchParams = useSearchParams()
  const extId = searchParams.get('ext') || ''
  const [status, setStatus] = useState<'loading' | 'ready' | 'sent' | 'error'>('loading')
  const [message, setMessage] = useState('Preparing secure connect…')
  const [email, setEmail] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)

  const canMessageExtension = useMemo(
    () => typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.sendMessage) && Boolean(extId),
    [extId],
  )

  const mintAndSend = useCallback(async () => {
    setStatus('loading')
    setMessage('Creating one-time connect code…')
    try {
      const res = await fetch('/api/extension/connect/start', { method: 'POST' })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: string
        email?: string | null
      }
      if (res.status === 401) {
        const next = `/extension/connect${extId ? `?ext=${encodeURIComponent(extId)}` : ''}`
        window.location.href = `/login?next=${encodeURIComponent(next)}`
        return
      }
      if (!res.ok || !json.code) throw new Error(json.error || 'Failed to start connect')

      setCode(json.code)
      setEmail(json.email ?? null)

      if (extId && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const runtime = chrome.runtime
        await new Promise<void>((resolve, reject) => {
          runtime.sendMessage(
            extId,
            { type: EXT_MESSAGE_TYPE, code: json.code, email: json.email ?? null },
            response => {
              if (runtime.lastError) {
                reject(new Error(runtime.lastError.message))
                return
              }
              if (response?.ok) resolve()
              else reject(new Error(response?.error || 'Extension did not accept the code'))
            },
          )
        })
        setStatus('sent')
        setMessage('Connected. You can close this tab and return to the job page.')
      } else {
        setStatus('ready')
        setMessage(
          extId
            ? 'Code ready. If the extension did not connect automatically, click Retry below.'
            : 'Open this page from the HireIQ extension popup so we know which extension to connect.',
        )
      }
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Connect failed')
    }
  }, [extId])

  useEffect(() => {
    void mintAndSend()
  }, [mintAndSend])

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
          <Puzzle className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Connect Chrome extension</h1>
          <p className="text-sm text-muted-foreground">
            Sign in once on HireIQ — Google or email — then we link the extension.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-2 text-sm">
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 mt-0.5 animate-spin shrink-0" />
          ) : status === 'sent' ? (
            <Check className="h-4 w-4 mt-0.5 text-brand-green shrink-0" />
          ) : null}
          <div>
            <p className="text-foreground">{message}</p>
            {email && <p className="mt-1 text-xs text-muted-foreground">Signed in as {email}</p>}
          </div>
        </div>

        {!canMessageExtension && status !== 'loading' && (
          <p className="text-xs text-muted-foreground">
            Tip: use <strong>Connect HireIQ</strong> in the extension popup so this page can talk to
            the extension automatically.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => void mintAndSend()}>
            Retry connect
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>

        {code && status === 'error' && (
          <p className="text-[11px] text-muted-foreground break-all">Debug code present (not for sharing).</p>
        )}
      </div>
    </div>
  )
}

declare const chrome: {
  runtime?: {
    sendMessage: (
      extensionId: string,
      message: unknown,
      responseCallback?: (response: { ok?: boolean; error?: string }) => void,
    ) => void
    lastError?: { message?: string }
  }
}
