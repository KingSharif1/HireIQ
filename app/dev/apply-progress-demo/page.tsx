'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Circle, Loader2, PauseCircle, X } from 'lucide-react'
import {
  createInitialApplyProgress,
  patchApplyProgress,
  type ApplyProgress,
  type ApplyProgressStep,
} from '@/lib/apply/types'
import { cn } from '@/lib/utils'

const FIELD_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  email: 'Email',
  phone: 'Phone',
  linkedin: 'LinkedIn',
  resume: 'Resume PDF',
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
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
    case 'active':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-800'
    case 'skipped':
      return 'border-amber-500/35 bg-amber-500/10 text-amber-800'
    default:
      return 'border-border/60 bg-muted/40 text-muted-foreground'
  }
}

function nextFrame(prev: ApplyProgress, step: number): ApplyProgress | null {
  switch (step) {
    case 0:
      return patchApplyProgress(createInitialApplyProgress(), {
        currentStep: 'open',
        stepState: 'active',
        detail: 'Launching browser…',
      })
    case 1:
      return patchApplyProgress(prev, {
        currentStep: 'form',
        stepState: 'active',
        detail: 'Looking for Apply / form…',
      })
    case 2:
      return patchApplyProgress(prev, {
        currentStep: 'identity',
        stepState: 'active',
        filled: ['first_name'],
        detail: 'Filled first_name',
        percent: 38,
      })
    case 3:
      return patchApplyProgress(prev, {
        currentStep: 'identity',
        stepState: 'active',
        filled: ['first_name', 'last_name', 'email'],
        detail: 'Filled first_name, last_name, email',
        percent: 52,
      })
    case 4:
      return patchApplyProgress(prev, {
        currentStep: 'identity',
        stepState: 'active',
        filled: ['first_name', 'last_name', 'email', 'phone', 'linkedin'],
        detail: 'Filled first_name, last_name, email, phone, linkedin',
        percent: 68,
      })
    case 5:
      return patchApplyProgress(prev, {
        currentStep: 'resume',
        stepState: 'active',
        filled: ['first_name', 'last_name', 'email', 'phone', 'linkedin'],
        detail: 'Attaching tailored PDF…',
      })
    case 6:
      return patchApplyProgress(prev, {
        currentStep: 'resume',
        stepState: 'done',
        filled: ['first_name', 'last_name', 'email', 'phone', 'linkedin', 'resume'],
        detail: 'Resume attached',
      })
    case 7:
      return patchApplyProgress(prev, {
        currentStep: 'submit',
        stepState: 'skipped',
        filled: ['first_name', 'last_name', 'email', 'phone', 'linkedin', 'resume'],
        notes: ['Dry run — Submit not clicked'],
        detail: 'Paused for your review (dry run)',
      })
    case 8:
      return patchApplyProgress(prev, {
        currentStep: 'done',
        stepState: 'done',
        filled: ['first_name', 'last_name', 'email', 'phone', 'linkedin', 'resume'],
        detail: 'Ready for your review',
        percent: 100,
      })
    default:
      return null
  }
}

/** Visual-only demo of live apply progress (no Playwright / auth). */
export default function ApplyProgressDemoPage() {
  const reduceMotion = useReducedMotion()
  const [progress, setProgress] = useState<ApplyProgress>(() => createInitialApplyProgress())
  const [playing, setPlaying] = useState(false)
  const stepRef = useRef(0)
  const progressRef = useRef(progress)
  progressRef.current = progress

  const play = useCallback(() => {
    stepRef.current = 0
    const initial = createInitialApplyProgress()
    progressRef.current = initial
    setProgress(initial)
    setPlaying(true)
  }, [])

  useEffect(() => {
    play()
  }, [play])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const next = nextFrame(progressRef.current, stepRef.current)
      if (!next) {
        window.clearInterval(id)
        setPlaying(false)
        return
      }
      progressRef.current = next
      setProgress(next)
      stepRef.current += 1
    }, 650)
    return () => window.clearInterval(id)
  }, [playing])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f6f7f9] p-6">
      <button
        type="button"
        onClick={play}
        className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium shadow-sm"
      >
        Replay demo
      </button>
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm">
        <div className="relative overflow-hidden px-4 pb-4 pt-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(14,165,233,0.08),transparent_55%),radial-gradient(90%_70%_at_100%_0%,rgba(16,185,129,0.07),transparent_50%)]"
          />
          <p className="relative text-sm font-semibold tracking-tight">HireIQ is applying</p>
          <p className="relative mt-0.5 text-[11px] text-muted-foreground">
            greenhouse · dry run (no submit yet)
          </p>

          <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
              animate={{ width: `${Math.max(progress.percent, 2)}%` }}
              transition={
                reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 24 }
              }
            />
          </div>
          <p className="relative mt-1 text-right text-[10px] tabular-nums text-muted-foreground">
            {Math.round(progress.percent)}%
          </p>

          <ol className="relative mt-2 space-y-1.5">
            {progress.steps.map(step => (
              <li
                key={step.id}
                className={cn(
                  'flex items-start gap-2 rounded-lg border px-2 py-1.5 text-[11px]',
                  stepTone(step.state)
                )}
              >
                <span className="mt-0.5">
                  <StepIcon state={step.state} />
                </span>
                <span>
                  <span className="font-medium">{step.label}</span>
                  {step.detail ? (
                    <span className="mt-0.5 block text-[10px] opacity-80">{step.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>

          <AnimatePresence>
            {progress.filled.length > 0 ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative mt-3"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Filled
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {progress.filled.map(field => (
                    <motion.span
                      key={field}
                      initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      {FIELD_LABELS[field] || field}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
