'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Circle, Loader2, PauseCircle, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  createInitialApplyProgress,
  parseApplyProgress,
  type ApplyProgress,
  type ApplyProgressStep,
  type ApplyRunRow,
  type ApplyRunStatus,
} from '@/lib/apply/types'
import { cn } from '@/lib/utils'

type Props = {
  jobId: string
  hasApplyUrl: boolean
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  full_name: 'Full name',
  email: 'Email',
  phone: 'Phone',
  linkedin: 'LinkedIn',
  website: 'Website',
  resume: 'Resume PDF',
}

function humanField(id: string): string {
  return FIELD_LABELS[id] || id.replace(/_/g, ' ')
}

function statusHeadline(status: ApplyRunStatus): string {
  switch (status) {
    case 'queued':
      return 'Waiting for worker…'
    case 'running':
      return 'HireIQ is applying'
    case 'applied':
      return 'Submitted'
    case 'needs_user':
      return 'Needs your review'
    case 'failed':
      return 'Couldn’t finish'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

function StepIcon({ state }: { state: ApplyProgressStep['state'] }) {
  if (state === 'done') return <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
  if (state === 'active') return <Loader2 className="h-3.5 w-3.5 animate-spin" />
  if (state === 'blocked') return <X className="h-3.5 w-3.5" strokeWidth={2.5} />
  if (state === 'skipped') return <PauseCircle className="h-3.5 w-3.5" />
  return <Circle className="h-3 w-3 opacity-40" />
}

function stepTone(state: ApplyProgressStep['state']): string {
  switch (state) {
    case 'done':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    case 'active':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300'
    case 'blocked':
      return 'border-destructive/40 bg-destructive/10 text-destructive'
    case 'skipped':
      return 'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300'
    default:
      return 'border-border/60 bg-muted/40 text-muted-foreground'
  }
}

/**
 * Job detail primary CTA + live apply progress (fields filled, step motion).
 */
export function AutoApplyWithHireIQ({ jobId, hasApplyUrl }: Props) {
  const reduceMotion = useReducedMotion()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [run, setRun] = useState<ApplyRunRow | null>(null)
  const [dispatchNote, setDispatchNote] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startLockRef = useRef(false)

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
      }, 900)
    },
    [stopPoll]
  )

  useEffect(() => () => stopPoll(), [stopPoll])

  const progress: ApplyProgress = useMemo(() => {
    if (!run) return createInitialApplyProgress()
    const parsed = parseApplyProgress(run.result)
    if (parsed) return parsed
    if (run.status === 'queued') {
      return createInitialApplyProgress()
    }
    const filled = Array.isArray(run.result?.filled) ? (run.result.filled as string[]) : []
    const notes = Array.isArray(run.result?.notes) ? (run.result.notes as string[]) : []
    return {
      ...createInitialApplyProgress(),
      filled,
      notes,
      percent: run.status === 'running' ? 15 : 100,
      currentStep: run.status === 'running' ? 'open' : 'done',
    }
  }, [run])

  async function startApply(force = false) {
    if (startLockRef.current || busy) return
    if (run && ['queued', 'running'].includes(run.status)) return
    if (run && ['failed', 'applied', 'needs_user'].includes(run.status) && !force) {
      setOpen(true)
      setError('Stopped after that attempt — we will not retry automatically.')
      return
    }
    startLockRef.current = true
    setError(null)
    setDispatchNote(null)
    setBusy(true)
    setOpen(true)
    try {
      const res = await fetch(`/api/apply/jobs/${jobId}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submit: false, force }),
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
            'Queued — deploy Cloud Run and set APPLY_WORKER_URL (see docs/CLOUD-RUN-APPLY.md).'
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
    } finally {
      startLockRef.current = false
    }
  }

  if (!hasApplyUrl) return null

  const showPanel = open && (run != null || error != null || dispatchNote != null)

  return (
    <div className="relative flex shrink-0 flex-col items-end">
      <Button
        type="button"
        size="sm"
        disabled={busy}
        title="Fills the form from your profile, then pauses for review"
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

      <AnimatePresence initial={false}>
        {showPanel ? (
          <motion.div
            key="apply-progress"
            initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="absolute right-0 top-full z-30 mt-2 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-xl border border-border/80 bg-white shadow-lg dark:bg-card"
            aria-live="polite"
          >
            <div className="relative overflow-hidden px-3.5 pb-3.5 pt-3">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(14,165,233,0.08),transparent_55%),radial-gradient(90%_70%_at_100%_0%,rgba(16,185,129,0.07),transparent_50%)]"
              />
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    {run ? statusHeadline(run.status) : 'Auto-apply'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {run?.board ? `${run.board} · ` : null}
                    {run?.complexity === 3 ? 'complex portal · ' : null}
                    dry run (no submit yet)
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Dismiss progress"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
                  initial={false}
                  animate={{ width: `${Math.max(4, Math.min(100, progress.percent))}%` }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 120, damping: 24 }
                  }
                />
              </div>
              <p className="relative mt-1 text-right text-[10px] tabular-nums text-muted-foreground">
                {Math.round(progress.percent)}%
              </p>

              <ol className="relative mt-2 space-y-1.5">
                {progress.steps.map((step, index) => (
                  <motion.li
                    key={step.id}
                    initial={reduceMotion ? false : { opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduceMotion ? 0 : index * 0.04 }}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border px-2 py-1.5 text-[11px] leading-snug transition-colors',
                      stepTone(step.state)
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      <StepIcon state={step.state} />
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium">{step.label}</span>
                      {step.detail ? (
                        <span className="mt-0.5 block text-[10px] opacity-80">{step.detail}</span>
                      ) : null}
                    </span>
                  </motion.li>
                ))}
              </ol>

              <AnimatePresence initial={false}>
                {progress.filled.length > 0 ? (
                  <motion.div
                    key="filled"
                    initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="relative mt-3"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Filled
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {progress.filled.map((field, i) => (
                        <motion.span
                          key={`${field}-${i}`}
                          initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-300"
                        >
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          {humanField(field)}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {error || dispatchNote || run?.error ? (
                <p
                  className={cn(
                    'relative mt-3 text-[11px] leading-snug',
                    error || run?.status === 'failed'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  )}
                >
                  {error || dispatchNote || run?.error}
                </p>
              ) : null}

              {run && ['failed', 'applied', 'needs_user'].includes(run.status) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="relative mt-3 w-full text-[11px]"
                  disabled={busy}
                  onClick={() => void startApply(true)}
                >
                  Start a new run (billed again)
                </Button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
