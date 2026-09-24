'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useMotionPreference } from '@/components/marketing/useMotionPreference'

const KEYWORDS = ['React', 'TypeScript', 'System design', 'Leadership', 'APIs']

/** Signature visual: resume ↔ job matching with scan + rising score. */
export function MatchStage() {
  const { reduceMotion: reduce } = useMotionPreference()
  const [score, setScore] = useState(42)
  const displayedScore = reduce ? 87 : score

  useEffect(() => {
    if (reduce) return
    const start = performance.now()
    const from = 42
    const to = 87
    const duration = 1600
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setScore(Math.round(from + (to - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    const delay = window.setTimeout(() => {
      frame = requestAnimationFrame(tick)
    }, 500)
    return () => {
      window.clearTimeout(delay)
      cancelAnimationFrame(frame)
    }
  }, [reduce])

  return (
    <div className="relative mx-auto aspect-[5/4] min-h-[290px] w-full max-w-md select-none">
      <motion.div
        initial={reduce ? false : { opacity: 0, x: 28, rotate: 5 }}
        animate={{ opacity: 1, x: 0, rotate: 3 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="absolute right-0 top-0 w-[62%] rounded-xl border border-border bg-card p-3.5 shadow-[4px_4px_0_hsl(var(--ink-shadow)/0.14)] sm:p-4"
      >
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Job URL
        </p>
        <div className="space-y-2">
          <div className="h-2 w-4/5 rounded-full bg-foreground/15" />
          <div className="h-2 w-full rounded-full bg-foreground/10" />
          <div className="h-2 w-3/5 rounded-full bg-foreground/10" />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {KEYWORDS.map((k, i) => (
            <motion.span
              key={k}
              initial={reduce ? false : { opacity: 0.4 }}
              animate={reduce ? { opacity: 1 } : { opacity: [0.4, 1, 0.55, 1] }}
              transition={{ duration: 3.2, delay: 0.8 + i * 0.35, repeat: Infinity, repeatDelay: 1.2 }}
              className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {k}
            </motion.span>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, x: -24, rotate: -6 }}
        animate={{ opacity: 1, x: 0, rotate: -4 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 w-[58%] rounded-xl border border-border bg-background p-3.5 shadow-[4px_4px_0_hsl(var(--ink-shadow)/0.18)] sm:p-4"
      >
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Master + GitHub
        </p>
        <div className="relative space-y-2 overflow-hidden rounded-lg">
          <div className="h-2.5 w-2/3 rounded-full bg-foreground/20" />
          <div className="h-1.5 w-full rounded-full bg-foreground/10" />
          <div className="h-1.5 w-[92%] rounded-full bg-foreground/10" />
          <div className="h-1.5 w-4/5 rounded-full bg-foreground/10" />
          <div className="space-y-1.5 pt-2">
            <div className="h-1.5 w-full rounded-full bg-primary/35" />
            <div className="h-1.5 w-5/6 rounded-full bg-primary/25" />
            <div className="h-1.5 w-3/4 rounded-full bg-foreground/10" />
          </div>
          {!reduce && (
            <div className="absolute left-0 right-0 h-5 border-y border-primary/50 bg-primary/15 animate-mk-scan" />
          )}
        </div>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.8, rotate: 4 }}
        animate={{ opacity: 1, scale: 1, rotate: -6 }}
        transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-[48%] top-[48%] z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-primary bg-card text-center shadow-[3px_3px_0_hsl(var(--ink-shadow)/0.2),inset_0_0_0_3px_hsl(var(--card)),inset_0_0_0_4px_hsl(var(--primary)/0.45)] sm:h-28 sm:w-28"
      >
        <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-[9px]">
          Tailored
        </p>
        <p className="font-display text-xl font-bold tabular-nums text-primary sm:text-2xl">
          {displayedScore}%
        </p>
      </motion.div>
    </div>
  )
}
