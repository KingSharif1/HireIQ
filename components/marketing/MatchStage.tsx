'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const KEYWORDS = ['React', 'TypeScript', 'System design', 'Leadership', 'APIs']

/** Signature visual: resume ↔ job matching with scan + rising score. */
export function MatchStage() {
  const reduce = useReducedMotion()
  const [score, setScore] = useState(reduce ? 87 : 42)

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
    <div className="relative mx-auto w-full max-w-lg aspect-[5/4] select-none">
      <motion.div
        initial={reduce ? false : { opacity: 0, x: 28, rotate: 4 }}
        animate={{ opacity: 1, x: 0, rotate: 3 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="absolute right-0 top-6 w-[58%] rounded-2xl border border-white/10 bg-[#0e1c30]/90 p-4 shadow-2xl shadow-black/40 backdrop-blur-md"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mk-mist)] mb-3">Job description</p>
        <div className="space-y-2">
          <div className="h-2 w-4/5 rounded-full bg-white/10" />
          <div className="h-2 w-full rounded-full bg-white/10" />
          <div className="h-2 w-3/5 rounded-full bg-white/10" />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {KEYWORDS.map((k, i) => (
            <motion.span
              key={k}
              initial={reduce ? false : { opacity: 0.4 }}
              animate={reduce ? { opacity: 1 } : { opacity: [0.4, 1, 0.55, 1] }}
              transition={{ duration: 3.2, delay: 0.8 + i * 0.35, repeat: Infinity, repeatDelay: 1.2 }}
              className="rounded-md border border-teal-400/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-200"
            >
              {k}
            </motion.span>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, x: -24, rotate: -5 }}
        animate={{ opacity: 1, x: 0, rotate: -4 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-0 top-0 w-[55%] rounded-2xl border border-white/15 bg-[var(--mk-paper)] p-4 text-[#0c1829] shadow-2xl shadow-black/50"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#5a6b7c]">Your resume</p>
          <span className="text-[10px] font-semibold text-teal-700">HireIQ</span>
        </div>
        <div className="relative space-y-2 overflow-hidden rounded-lg">
          <div className="h-2.5 w-2/3 rounded-full bg-[#0c1829]/15" />
          <div className="h-1.5 w-full rounded-full bg-[#0c1829]/08" />
          <div className="h-1.5 w-[92%] rounded-full bg-[#0c1829]/08" />
          <div className="h-1.5 w-4/5 rounded-full bg-[#0c1829]/08" />
          <div className="space-y-1.5 pt-2">
            <div className="h-1.5 w-full rounded-full bg-teal-600/25" />
            <div className="h-1.5 w-5/6 rounded-full bg-teal-600/20" />
            <div className="h-1.5 w-3/4 rounded-full bg-[#0c1829]/08" />
          </div>
          {!reduce && (
            <div className="absolute left-0 right-0 h-8 bg-gradient-to-b from-teal-400/0 via-teal-400/35 to-teal-400/0 animate-mk-scan" />
          )}
        </div>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.85, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-2xl border border-teal-400/40 bg-[#07111f]/90 px-5 py-3 shadow-lg shadow-teal-950/50 backdrop-blur-md"
      >
        <p className="mb-1 text-center text-[10px] uppercase tracking-[0.2em] text-[var(--mk-mist)]">
          Match score
        </p>
        <div className="flex items-end justify-center gap-1">
          <span className="font-display text-3xl font-bold tabular-nums text-teal-300">{score}</span>
          <span className="mb-1 text-sm text-teal-400/80">%</span>
        </div>
      </motion.div>
    </div>
  )
}
