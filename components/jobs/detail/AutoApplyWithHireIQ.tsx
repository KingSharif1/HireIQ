'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApplyRunRow, ApplyRunStatus } from '@/lib/apply/types'
import { cn } from '@/lib/utils'

type Props = {
  jobId: string
  hasApplyUrl: boolean
}

function statusLabel(status: ApplyRunStatus): string {
  switch (status) {
    case 'queued':
      return 'Queued…'
    case 'running':
      return 'Filling application…'
    case 'applied':
      return 'Submitted'
    case 'needs_user':
      return 'Needs your review'
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

function statusTone(status: ApplyRunStatus): string {
  switch (status) {
    case 'applied':
      return 'text-emerald-700 dark:text-emerald-400'
    case 'failed':
      return 'text-destructive'
    case 'needs_user':
      return 'text-amber-700 dark:text-amber-400'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Job detail primary CTA: queue Cloud Run hosted apply (fill-first / dry-run).
 */
export function AutoApplyWithHireIQ({ jobId, hasApplyUrl }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [run, setRun] = useState<ApplyRunRow | null>(null)
  const [dispatchNote, setDispatchNote] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const pollRun = useCallback(
    (runId: string) => {
      stopPoll()
      pollRef.current = setInterval(() => {
        void (async () => {
          const res = await fetch(`/api/apply/runs/${runId}`)
          const body = (await res.json().catch(() => ({}))) as {
            run?: ApplyRunRow
            error?: string
          }
          if (!res.ok || !body.run) return
          setRun(body.run)
          if (!['queued', 'running'].includes(body.run.status)) {
            stopPoll()
            setBusy(false)
          }
        })()
      }, 2000)
    },
    [stopPoll]
  )

  useEffect(() => () => stopPoll(), [stopPoll])

  async function startApply() {
    setError(null)
    setDispatchNote(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/apply/jobs/${jobId}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submit: false }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        run?: ApplyRunRow
        dispatch?: { dispatched: boolean; reason?: string }
        error?: string
      }
      if (!res.ok || !body.run) {
        throw new Error(body.error || 'Could not start auto-apply')
      }
      setRun(body.run)
      if (body.dispatch && !body.dispatch.dispatched) {
        setDispatchNote(
          body.dispatch.reason ||
            'Queued — worker not configured yet (set APPLY_WORKER_URL).'
        )
        setBusy(false)
        return
      }
      if (['queued', 'running'].includes(body.run.status)) {
        pollRun(body.run.id)
      } else {
        setBusy(false)
      }
    } catch (cause) {
      setBusy(false)
      setError(cause instanceof Error ? cause.message : 'Could not start auto-apply')
    }
  }

  if (!hasApplyUrl) return null

  const terminal = run && !['queued', 'running'].includes(run.status)
  const detail =
    error ||
    dispatchNote ||
    (run
      ? `${statusLabel(run.status)}${run.complexity === 3 ? ' · complex portal' : ''}${
          terminal && run.error ? ` — ${run.error}` : ''
        }`
      : 'Fills the form from your profile (review before submit).')

  return (
    <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={() => void startApply()}
        className="gap-1.5"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        Auto-apply with HireIQ
      </Button>
      <p
        className={cn(
          'max-w-[18rem] text-[11px] leading-snug sm:text-right',
          error
            ? 'text-destructive'
            : run
              ? statusTone(run.status)
              : 'text-muted-foreground'
        )}
        aria-live="polite"
      >
        {detail}
      </p>
    </div>
  )
}
