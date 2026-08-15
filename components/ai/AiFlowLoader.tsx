'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, Check, Circle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type AiFlowStage = {
  id: string
  label: string
  detail?: string
}

type AiFlowLoaderProps = {
  title: string
  subtitle?: string
  stages?: AiFlowStage[]
  /** Index of the stage currently in progress (0-based). Stages before this are done. */
  activeIndex?: number
  error?: { title: string; message: string } | null
  actionLabel?: string
  onAction?: () => void
  className?: string
}

function StageIcon({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') return <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
  if (state === 'active') return <Loader2 className="h-3.5 w-3.5 animate-spin" />
  return <Circle className="h-3 w-3 opacity-35" />
}

function stageTone(state: 'done' | 'active' | 'pending'): string {
  switch (state) {
    case 'done':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
    case 'active':
      return 'border-teal-500/40 bg-teal-500/10 text-teal-900 dark:text-teal-200 shadow-sm shadow-teal-500/10'
    default:
      return 'border-border/60 bg-muted/30 text-muted-foreground'
  }
}

/**
 * Staged AI progress — used for JD analyze, resume tailor, cover letter, etc.
 */
export function AiFlowLoader({
  title,
  subtitle,
  stages = [],
  activeIndex = 0,
  error,
  actionLabel,
  onAction,
  className,
}: AiFlowLoaderProps) {
  const reduceMotion = useReducedMotion()
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    if (reduceMotion || error) return
    const id = window.setInterval(() => setPulse(p => (p + 1) % 3), 900)
    return () => window.clearInterval(id)
  }, [reduceMotion, error])

  const activeStage = stages[activeIndex]
  const failed = Boolean(error)

  return (
    <div
      className={cn(
        'flex min-h-[min(420px,calc(100dvh-12rem))] flex-col items-center justify-center px-4 py-10',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy={!failed}
    >
      <div className="relative w-full max-w-md">
        <motion.div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -inset-6 rounded-[2rem] blur-2xl',
            failed
              ? 'bg-gradient-to-br from-destructive/20 via-transparent to-transparent'
              : 'bg-gradient-to-br from-teal-500/15 via-transparent to-violet-500/10'
          )}
          animate={reduceMotion ? undefined : { opacity: [0.45, 0.75, 0.45], scale: [0.98, 1.02, 0.98] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/90 p-6 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border',
                failed
                  ? 'border-destructive/30 bg-destructive/10'
                  : 'border-teal-500/25 bg-teal-500/10'
              )}
            >
              {failed ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <>
                  <motion.span
                    className="absolute inset-1 rounded-lg border border-teal-400/20"
                    animate={reduceMotion ? undefined : { rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  />
                  <Loader2 className="relative h-5 w-5 animate-spin text-teal-600 dark:text-teal-300" />
                </>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-base font-semibold text-foreground">{error?.title ?? title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {error?.message ?? subtitle}
              </p>
            </div>
          </div>

          {failed && onAction ? (
            <Button type="button" className="mt-5 w-full" onClick={onAction}>
              {actionLabel ?? 'Try again'}
            </Button>
          ) : null}

          {!failed && activeStage ? (
            <AnimatePresence mode="wait">
              <motion.p
                key={activeStage.id}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="mt-5 text-sm font-medium text-foreground"
              >
                {activeStage.label}
              </motion.p>
            </AnimatePresence>
          ) : null}

          {!failed && activeStage?.detail ? (
            <p className="mt-1 text-xs text-muted-foreground">{activeStage.detail}</p>
          ) : null}

          {!failed ? (
            <div className="mt-4 flex gap-1.5" aria-hidden>
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-teal-500/70"
                  animate={
                    reduceMotion
                      ? undefined
                      : { opacity: pulse === i ? 1 : 0.25, scale: pulse === i ? 1.2 : 1 }
                  }
                  transition={{ duration: 0.2 }}
                />
              ))}
            </div>
          ) : null}

          {!failed && stages.length > 1 ? (
            <ul className="mt-6 space-y-2">
              {stages.map((stage, i) => {
                const state: 'done' | 'active' | 'pending' =
                  i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending'
                return (
                  <motion.li
                    key={stage.id}
                    layout={!reduceMotion}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                      stageTone(state)
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/20 bg-background/40">
                      <StageIcon state={state} />
                    </span>
                    <span className="min-w-0 truncate font-medium">{stage.label}</span>
                  </motion.li>
                )
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}
