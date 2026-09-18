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
  /** When false, CTA explains Cloud Run setup instead of queueing a worker. */
  workerReady?: boolean
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

function statusHeadline(run: ApplyRunRow): string {
  switch (run.status) {
    case 'queued':
      return 'Waiting for worker…'
    case 'running':
      return 'HireIQ is filling the form'
    case 'applied':
      return run.submit ? 'Submitted' : 'Filled — review on the site'
    case 'needs_user':
      return 'Ready for your review'
    case 'failed':
      return 'Couldn’t finish'
    case 'cancelled':
      return 'Cancelled'
    default:
      return run.status
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
export function AutoApplyWithHireIQ({
  jobId,
  hasApplyUrl,
  workerReady = true,
}: Props) {
  const reduceMotion = useReducedMotion()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [run, setRun] = useState<ApplyRunRow | null>(null)
  const [dispatchNote, setDispatchNote] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [setupOnly, setSetupOnly] = useState(false)
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

  function openSetupPanel() {
    setSetupOnly(true)
    setError(null)
    setDispatchNote(null)
    setOpen(true)
  }

  async function startApply(force = false) {
    if (!workerReady) {
      openSetupPanel()
      return
    }
    if (startLockRef.current || busy) return
    if (run && ['queued', 'running'].includes(run.status)) return
    if (run && ['failed', 'applied', 'needs_user'].includes(run.status) && !force) {
      setOpen(true)
      setSetupOnly(false)
      setError('Stopped after that attempt — we will not retry automatically.')
      return
    }
    startLockRef.current = true
    setSetupOnly(false)
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

  const showPanel =
    open && (setupOnly || run != null || error != null || dispatchNote != null)

  return (
    <div className="relative flex shrink-0 flex-col items-end">
      <Button
        type="button"
        size="sm"
        variant={workerReady ? 'default' : 'outline'}
        disabled={busy}
        title={
          workerReady
            ? 'Fills the form from your profile, then pauses for your review — HireIQ does not submit until you confirm.'
            : 'Hosted auto-apply needs Cloud Run (APPLY_WORKER_URL). Open for setup steps.'
        }
        onClick={() => void startApply()}
        className="gap-1.5"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {workerReady ? 'Auto-apply with HireIQ' : 'Auto-apply (setup needed)'}
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
                    {setupOnly
                      ? 'Auto-apply setup needed'
                      : run
                        ? statusHeadline(run)
                        : 'Auto-apply'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {setupOnly
                      ? 'Worker offline on this environment'
                      : (
                          <>
                            {run?.board ? `${run.board} · ` : null}
                            {run?.complexity === 3 ? 'complex portal · ' : null}
                            Fills the form, then pauses for your review
                          </>
                        )}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Dismiss progress"
                  onClick={() => {
                    setOpen(false)
                    setSetupOnly(false)
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {setupOnly ? (
                <div className="relative mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                  <p className="text-foreground">
                    Hosted Auto-apply needs the Cloud Run worker. Until{' '}
                    <span className="font-mono text-foreground">APPLY_WORKER_URL</span> and{' '}
                    <span className="font-mono text-foreground">APPLY_WORKER_SECRET</span> are set,
                    this button will not queue a fill.
                  </p>
                  <p>
                    Meanwhile: open the employer apply page and use the Chrome extension, or follow{' '}
                    <span className="font-mono text-foreground">docs/CLOUD-RUN-APPLY.md</span>.
                  </p>
                </div>
              ) : (
                <>
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
                        <span>{step.label}</span>
                      </motion.li>
                    ))}
                  </ol>

                  {progress.filled.length > 0 ? (
                    <p className="relative mt-2 text-[11px] text-muted-foreground">
                      Filled:{' '}
                      {progress.filled.map(humanField).join(', ')}
                    </p>
                  ) : null}

                  {dispatchNote ? (
                    <p className="relative mt-2 text-[11px] text-amber-800 dark:text-amber-300">
                      {dispatchNote}
                    </p>
                  ) : null}
                  {error ? (
                    <p className="relative mt-2 text-[11px] text-destructive" role="alert">
                      {error}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
