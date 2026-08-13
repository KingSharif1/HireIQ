'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, X } from 'lucide-react'

const ease = [0.22, 1, 0.36, 1] as const

/**
 * Interactive product story — stacked scenes + clickable demos.
 * Motion is transform/opacity based (fine for Vercel).
 */
export function ProductScrollStory() {
  const reduce = useReducedMotion()

  return (
    <section className="relative pb-16 md:pb-24" aria-label="How HireIQ works">
      <Scene
        reduce={!!reduce}
        label="Tailor"
        title="Rewrite the resume for the role — you approve every change."
        body="Try it: accept or decline the suggested bullet. HireIQ proposes edits with tracked changes — you stay in control before export."
        hint="Click Accept or Decline"
        reverse={false}
      >
        <TailorWorkbench />
      </Scene>

      <Scene
        reduce={!!reduce}
        label="Extension"
        title="Stop retyping the same application forms."
        body="Try it: hit Fill remaining fields. The Chrome extension pulls your HireIQ profile into boards like Greenhouse and Lever — without applying for you."
        hint="Click Fill remaining fields"
        reverse
      >
        <ExtensionWorkbench />
      </Scene>

      <Scene
        reduce={!!reduce}
        label="Track"
        title="One board for every application you actually sent."
        body="Try it: move Orbit into Interview. Saved jobs, statuses, and optional email updates live here so you know what’s waiting."
        hint="Click a card to advance its stage"
        reverse={false}
      >
        <TrackerWorkbench />
      </Scene>
    </section>
  )
}

function Scene({
  label,
  title,
  body,
  hint,
  children,
  reverse,
  reduce,
}: {
  label: string
  title: string
  body: string
  hint: string
  children: React.ReactNode
  reverse: boolean
  reduce: boolean
}) {
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-12 md:gap-10 md:px-6 md:py-16">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.55, ease }}
        className={`md:col-span-5 ${reverse ? 'md:order-2' : ''}`}
      >
        <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-teal-300/90">
          {label}
        </p>
        <h3 className="font-display mt-2 text-xl font-semibold leading-tight text-white sm:text-2xl md:text-[1.65rem]">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[var(--mk-mist)] md:text-[15px]">{body}</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-teal-400/25 bg-teal-500/10 px-3 py-1 text-[11px] font-medium text-teal-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300" />
          {hint}
        </p>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 32, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.65, delay: 0.06, ease }}
        className={`md:col-span-7 ${reverse ? 'md:order-1' : ''}`}
      >
        <div className="relative mx-auto aspect-[4/3] w-full max-w-lg md:max-w-none md:aspect-[5/4]">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

function Shell({
  children,
  title,
  badge,
}: {
  children: React.ReactNode
  title: string
  badge?: string
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a1524]/95 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.65)] backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/[0.08] px-3 py-2.5 sm:px-4 sm:py-3">
        <span className="h-2 w-2 rounded-full bg-white/15 sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 rounded-full bg-white/15 sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 rounded-full bg-white/15 sm:h-2.5 sm:w-2.5" />
        <span className="ml-2 flex-1 truncate text-[10px] text-[var(--mk-mist)] sm:text-xs">
          {title}
        </span>
        {badge && (
          <span className="rounded-md bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-300">
            {badge}
          </span>
        )}
      </div>
      <div className="relative min-h-0 flex-1 p-2.5 sm:p-4">{children}</div>
    </div>
  )
}

function TailorWorkbench() {
  const [decision, setDecision] = useState<'pending' | 'accepted' | 'declined'>('pending')
  const score = decision === 'accepted' ? 87 : decision === 'declined' ? 71 : 78

  return (
    <Shell title="HireIQ — Job matcher" badge="Tailor">
      <div className="grid h-full grid-cols-2 gap-2 sm:gap-3">
        <div className="flex flex-col rounded-xl bg-[var(--mk-paper)] p-2.5 text-[#0c1829] shadow-inner sm:p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5a6b7c] sm:text-[10px]">
            Resume
          </p>
          <div className="mt-2 space-y-1.5">
            <div className="h-2 w-2/3 rounded-full bg-[#0c1829]/12" />
            <p className="text-[10px] leading-snug text-[#334155] sm:text-[11px]">
              Built React dashboards for ops teams…
            </p>
            <AnimatePresence mode="wait">
              {decision !== 'declined' && (
                <motion.div
                  key={decision}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`rounded px-1.5 py-1 text-[10px] leading-snug ring-1 sm:text-[11px] ${
                    decision === 'accepted'
                      ? 'bg-teal-200/90 text-teal-950 ring-teal-500/50'
                      : 'bg-teal-100/80 text-teal-900 ring-teal-400/40'
                  }`}
                >
                  + Led TypeScript migrations across 4 product squads
                </motion.div>
              )}
            </AnimatePresence>
            <div className="h-1.5 w-full rounded-full bg-[#0c1829]/08" />
            <div className="h-1.5 w-4/5 rounded-full bg-[#0c1829]/08" />
          </div>

          <div className="mt-auto flex gap-1.5 pt-3">
            {decision === 'pending' ? (
              <>
                <button
                  type="button"
                  onClick={() => setDecision('accepted')}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-teal-600 px-2 py-1.5 text-[10px] font-semibold text-white transition hover:bg-teal-500 sm:text-[11px]"
                >
                  <Check className="h-3 w-3" /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('declined')}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-[11px]"
                >
                  <X className="h-3 w-3" /> Decline
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setDecision('pending')}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 sm:text-[11px]"
              >
                Reset change
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-white/10 bg-[#0e1c30] p-2.5 sm:p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--mk-mist)] sm:text-[10px]">
            Job · Staff Frontend
          </p>
          <div className="mt-3 space-y-2">
            {['TypeScript', 'System design', 'Mentorship'].map((k, i) => (
              <div key={k} className="flex items-center gap-2" style={{ width: `${70 + i * 8}%` }}>
                <span className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-teal-400 to-teal-400/20" />
                <span className="hidden w-14 text-right text-[9px] text-teal-200/80 sm:block sm:w-16 sm:text-[10px]">
                  {k}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-end justify-between pt-3">
            <span className="text-[9px] text-[var(--mk-mist)] sm:text-[10px]">Match</span>
            <motion.span
              key={score}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display text-2xl font-bold text-teal-300 sm:text-3xl"
            >
              {score}%
            </motion.span>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function TypeField({
  label,
  value,
  delay,
  play,
}: {
  label: string
  value: string
  delay: number
  play: boolean
}) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!play) {
      setText('')
      return
    }
    setText('')
    let intervalId: number | undefined
    const start = window.setTimeout(() => {
      let i = 0
      intervalId = window.setInterval(() => {
        i += 1
        setText(value.slice(0, i))
        if (i >= value.length && intervalId !== undefined) window.clearInterval(intervalId)
      }, 24)
    }, delay)
    return () => {
      window.clearTimeout(start)
      if (intervalId !== undefined) window.clearInterval(intervalId)
    }
  }, [play, value, delay])

  return (
    <div className="space-y-1">
      <p className="text-[8px] text-slate-500 sm:text-[9px]">{label}</p>
      <div className="min-h-[1.6rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-800 sm:text-[11px]">
        {text || <span className="text-slate-300">…</span>}
        {play && text.length < value.length && (
          <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-teal-500 align-middle" />
        )}
      </div>
    </div>
  )
}

function ExtensionWorkbench() {
  const reduce = useReducedMotion()
  const [play, setPlay] = useState(false)
  const [filled, setFilled] = useState(false)

  function fill() {
    if (reduce) {
      setFilled(true)
      setPlay(true)
      return
    }
    setFilled(false)
    setPlay(false)
    window.requestAnimationFrame(() => {
      setPlay(true)
      setFilled(true)
    })
  }

  return (
    <Shell title="careers.example.com / apply" badge="Extension">
      <div className="relative grid h-full grid-cols-[1fr_0.9fr] gap-1.5 overflow-hidden rounded-xl bg-[#f4f6f8] sm:gap-2">
        <div className="space-y-1.5 overflow-hidden p-2 sm:space-y-2 sm:p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[10px]">
            Application form
          </p>
          <TypeField label="Full name" value="Alex Rivera" delay={120} play={play && !reduce} />
          <TypeField label="Email" value="alex@hireiq.app" delay={520} play={play && !reduce} />
          <TypeField label="Years of experience" value="6" delay={900} play={play && !reduce} />
          <TypeField
            label="Why this role?"
            value="Scaled design systems…"
            delay={1200}
            play={play && !reduce}
          />
          {reduce && filled && (
            <p className="text-[9px] text-teal-700">Fields filled</p>
          )}
        </div>
        <div className="m-1.5 flex flex-col rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl shadow-slate-900/10 sm:m-2 sm:p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0c1829] text-[9px] font-bold text-teal-300">
              IQ
            </span>
            <div>
              <p className="text-[10px] font-semibold text-slate-900 sm:text-[11px]">HireIQ</p>
              <p className="text-[8px] text-slate-500 sm:text-[9px]">
                {filled ? 'Filled' : 'Ready to fill'}
              </p>
            </div>
          </div>
          <div className="space-y-1 text-[9px] text-slate-600 sm:text-[10px]">
            <p className="rounded-md bg-teal-50 px-2 py-1 text-teal-800">Profile 100%</p>
            <p className="rounded-md bg-slate-50 px-2 py-1">Resume attached</p>
            <p className="rounded-md bg-slate-50 px-2 py-1">
              {filled ? '4 answers filled' : '4 answers ready'}
            </p>
          </div>
          <button
            type="button"
            onClick={fill}
            className="mt-auto rounded-lg bg-teal-500 py-2 text-center text-[10px] font-semibold text-[#042f2e] transition hover:bg-teal-400 active:scale-[0.98] sm:text-[11px]"
          >
            {filled ? 'Fill again' : 'Fill remaining fields'}
          </button>
        </div>
      </div>
    </Shell>
  )
}

type ColId = 'applied' | 'interview' | 'offer'

function TrackerWorkbench() {
  const reduce = useReducedMotion()
  const [cards, setCards] = useState<Record<string, ColId>>({
    acme: 'applied',
    northwind: 'applied',
    orbit: 'applied',
  })

  const meta: Record<string, string> = {
    acme: 'Acme · Frontend',
    northwind: 'Northwind · Fullstack',
    orbit: 'Orbit · Staff FE',
  }

  const order: ColId[] = ['applied', 'interview', 'offer']
  const labels: Record<ColId, string> = {
    applied: 'Applied',
    interview: 'Interview',
    offer: 'Offer',
  }

  function advance(id: string) {
    setCards(prev => {
      const cur = prev[id]
      const idx = order.indexOf(cur)
      const next = order[Math.min(idx + 1, order.length - 1)]
      return { ...prev, [id]: next }
    })
  }

  return (
    <Shell title="HireIQ — Applications" badge="Tracker">
      <div className="grid h-full grid-cols-3 gap-1.5 sm:gap-2">
        {order.map(col => (
          <div key={col} className="rounded-xl bg-white/5 p-1.5 sm:p-2">
            <p className="mb-1.5 px-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--mk-mist)] sm:mb-2 sm:text-[10px]">
              {labels[col]}
            </p>
            <div className="min-h-[4.5rem] space-y-1.5 sm:min-h-[5.5rem] sm:space-y-2">
              <AnimatePresence>
                {Object.entries(cards)
                  .filter(([, c]) => c === col)
                  .map(([id], i) => (
                    <motion.button
                      key={id}
                      type="button"
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.04, type: 'spring', stiffness: 220, damping: 22 }}
                      onClick={() => advance(id)}
                      className="w-full rounded-lg border border-white/10 bg-[#122033] px-2 py-1.5 text-left text-[9px] text-white/90 shadow-lg transition hover:border-teal-400/40 hover:bg-[#15263d] sm:px-2.5 sm:py-2 sm:text-[11px]"
                    >
                      {meta[id]}
                      {col === 'interview' && (
                        <p className="mt-1 text-[8px] text-teal-300 sm:text-[9px]">Interview invite</p>
                      )}
                      {col !== 'offer' && (
                        <p className="mt-1 text-[8px] text-white/35 sm:text-[9px]">Click to advance →</p>
                      )}
                    </motion.button>
                  ))}
              </AnimatePresence>
              {Object.values(cards).filter(c => c === col).length === 0 && (
                <div className="rounded-lg border border-dashed border-white/10 px-2 py-3 text-center text-[9px] text-white/30 sm:py-4 sm:text-[10px]">
                  —
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  )
}
