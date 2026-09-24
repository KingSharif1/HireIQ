'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useMotionPreference } from '@/components/marketing/useMotionPreference'

const ease = [0.22, 1, 0.36, 1] as const

/**
 * Interactive product story — stacked scenes + clickable demos.
 * Motion is transform/opacity based (fine for Vercel).
 */
export function ProductScrollStory() {
  const { reduceMotion: reduce } = useMotionPreference()

  return (
    <section className="relative pb-16 md:pb-24" aria-label="How HireIQ works">
      <Scene
        reduce={!!reduce}
        label="Tailor"
        title="Tailor from evidence—not guesses."
        body="HireIQ rewrites from your master resume and GitHub projects. Accept, decline, or edit every proposed change before export."
        hint="Try Accept or Decline"
        reverse={false}
      >
        <TailorWorkbench />
      </Scene>

      <Scene
        reduce={!!reduce}
        label="Extension"
        title="Auto-apply the jobs you select."
        body="On supported desktop job forms, the Chrome extension uses your profile and approved resume, submits automatically, and records the attempt. CAPTCHA or missing answers pause for you."
        hint="Try Auto-apply"
        reverse
      >
        <ExtensionWorkbench />
      </Scene>

      <Scene
        reduce={!!reduce}
        label="Track"
        title="Every application and reply, in one place."
        body="Gmail or your HireIQ application email connects employer replies to the job, while the tracker moves from Applied to Interview to Offer."
        hint="Move a card forward"
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
        <p className="poster-kicker text-primary">{label}</p>
        <h3 className="font-display mt-2 text-xl font-semibold leading-tight text-foreground sm:text-2xl md:text-[1.65rem]">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-[15px]">{body}</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
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
        <div className="relative mx-auto w-full max-w-lg md:min-h-[300px] md:max-w-none">
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
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[5px_5px_0_hsl(var(--ink-shadow)/0.14)] md:min-h-[300px]">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4 sm:py-3">
        <span className="h-2 w-2 rounded-full border border-foreground/30 sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 rounded-full border border-foreground/30 sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 rounded-full border border-foreground/30 sm:h-2.5 sm:w-2.5" />
        <span className="ml-2 flex-1 truncate text-[10px] text-muted-foreground sm:text-xs">
          {title}
        </span>
        {badge && (
          <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            {badge}
          </span>
        )}
      </div>
      <div className="relative min-h-0 p-2.5 sm:p-4">{children}</div>
    </div>
  )
}

function TailorWorkbench() {
  const [decision, setDecision] = useState<'pending' | 'accepted' | 'declined'>('pending')
  const score = decision === 'accepted' ? 87 : decision === 'declined' ? 71 : 78

  return (
    <Shell title="HireIQ — Job matcher" badge="Tailor">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="flex flex-col rounded-lg border border-border bg-background p-2.5 sm:p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
            Master + GitHub
          </p>
          <div className="mt-2 space-y-1.5">
            <div className="h-2 w-2/3 rounded-full bg-foreground/15" />
            <p className="text-[10px] leading-snug text-foreground/70 sm:text-[11px]">
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
                      ? 'bg-primary/20 text-foreground ring-primary/60'
                      : 'bg-primary/10 text-foreground/80 ring-primary/40'
                  }`}
                >
                  + Led TypeScript migrations across 4 product squads
                </motion.div>
              )}
            </AnimatePresence>
            <div className="h-1.5 w-full rounded-full bg-foreground/10" />
            <div className="h-1.5 w-4/5 rounded-full bg-foreground/10" />
          </div>

          <div className="mt-auto flex gap-1.5 pt-3">
            {decision === 'pending' ? (
              <>
                <button
                  type="button"
                  onClick={() => setDecision('accepted')}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-2 py-1.5 text-[10px] font-semibold text-primary-foreground transition hover:bg-primary/90 sm:text-[11px]"
                >
                  <Check className="h-3 w-3" /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('declined')}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] font-semibold text-foreground transition hover:bg-secondary sm:text-[11px]"
                >
                  <X className="h-3 w-3" /> Decline
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setDecision('pending')}
                className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-secondary sm:text-[11px]"
              >
                Reset change
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-lg border border-border bg-secondary/50 p-2.5 sm:p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
            Job · Staff Frontend
          </p>
          <div className="mt-3 space-y-2">
            {['TypeScript', 'System design', 'Mentorship'].map((k, i) => (
              <div key={k} className="flex items-center gap-2" style={{ width: `${70 + i * 8}%` }}>
                <span className="h-1.5 flex-1 rounded-full bg-primary/60" />
                <span className="hidden w-14 text-right text-[9px] text-primary/90 sm:block sm:w-16 sm:text-[10px]">
                  {k}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-end justify-between pt-3">
            <span className="text-[9px] text-muted-foreground sm:text-[10px]">Match</span>
            <motion.span
              key={score}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display text-2xl font-bold text-primary sm:text-3xl"
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
  done,
}: {
  label: string
  value: string
  delay: number
  play: boolean
  done: boolean
}) {
  const [count, setCount] = useState(0)
  const shown = done ? value : value.slice(0, count)

  useEffect(() => {
    if (!play) return
    let intervalId: number | undefined
    const start = window.setTimeout(() => {
      let i = 0
      intervalId = window.setInterval(() => {
        i += 1
        setCount(i)
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
      <p className="text-[8px] text-muted-foreground sm:text-[9px]">{label}</p>
      <div className="min-h-[1.6rem] rounded-md border border-border bg-card px-2 py-1 text-[10px] text-foreground sm:text-[11px]">
        {shown || <span className="text-muted-foreground/50">…</span>}
        {play && !done && count < value.length && (
          <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-primary align-middle" />
        )}
      </div>
    </div>
  )
}

function ExtensionWorkbench() {
  const { reduceMotion: reduce } = useMotionPreference()
  const [status, setStatus] = useState<'ready' | 'applying' | 'submitted'>('ready')
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const play = status === 'applying' && !reduce
  const done = status === 'submitted'

  function apply() {
    if (status !== 'ready') return
    if (reduce) {
      setStatus('submitted')
      return
    }
    setStatus('applying')
    timerRef.current = window.setTimeout(() => setStatus('submitted'), 3400)
  }

  const statusLabel = status === 'ready' ? 'Ready' : status === 'applying' ? 'Applying' : 'Submitted'
  const buttonLabel =
    status === 'ready'
      ? 'Auto-apply selected job'
      : status === 'applying'
        ? 'Applying…'
        : 'Submitted and logged'

  return (
    <Shell title="careers.example.com / apply" badge="Extension">
      <div className="relative grid grid-cols-[1fr_0.9fr] gap-1.5 overflow-hidden rounded-lg bg-secondary/50 sm:gap-2">
        <div className="space-y-1.5 overflow-hidden p-2 sm:space-y-2 sm:p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
            Application form
          </p>
          <TypeField label="Full name" value="Alex Rivera" delay={120} play={play} done={done} />
          <TypeField label="Email" value="alex@hireiq.app" delay={520} play={play} done={done} />
          <TypeField label="Years of experience" value="6" delay={900} play={play} done={done} />
          <TypeField
            label="Why this role?"
            value="Scaled design systems…"
            delay={1200}
            play={play}
            done={done}
          />
        </div>
        <div className="m-1.5 flex flex-col rounded-lg border border-border bg-card p-2.5 shadow-[3px_3px_0_hsl(var(--ink-shadow)/0.12)] sm:m-2 sm:p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-[9px] font-bold text-primary">
              IQ
            </span>
            <div>
              <p className="text-[10px] font-semibold text-foreground sm:text-[11px]">HireIQ</p>
              <p className="text-[8px] text-muted-foreground sm:text-[9px]">{statusLabel}</p>
            </div>
          </div>
          <div className="space-y-1 text-[9px] text-muted-foreground sm:text-[10px]">
            <p className="rounded-md bg-primary/10 px-2 py-1 text-primary">Profile 100%</p>
            <p className="rounded-md bg-secondary px-2 py-1">Resume attached</p>
            <p className="rounded-md bg-secondary px-2 py-1">
              {done || play ? '4 answers filled' : '4 answers ready'}
            </p>
            {done && (
              <p className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-primary">
                Added to Applications · Applied
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={apply}
            disabled={status !== 'ready'}
            className="mt-3 rounded-lg bg-primary py-2 text-center text-[10px] font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-default disabled:opacity-80 sm:text-[11px]"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </Shell>
  )
}

type ColId = 'applied' | 'interview' | 'offer'

function TrackerWorkbench() {
  const { reduceMotion: reduce } = useMotionPreference()
  const [cards, setCards] = useState<Record<string, ColId>>({
    acme: 'applied',
    orbit: 'applied',
    northwind: 'interview',
    atlas: 'offer',
  })

  const meta: Record<string, string> = {
    acme: 'Acme · Frontend',
    orbit: 'Orbit · Staff FE',
    northwind: 'Northwind · Fullstack',
    atlas: 'Atlas · Platform',
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
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {order.map(col => (
          <div key={col} className="rounded-lg bg-secondary/50 p-1.5 sm:p-2">
            <p className="mb-1.5 px-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:mb-2 sm:text-[10px]">
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
                      className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-left text-[9px] text-foreground shadow-[2px_2px_0_hsl(var(--ink-shadow)/0.12)] transition hover:border-primary/50 sm:px-2.5 sm:py-2 sm:text-[11px]"
                    >
                      {meta[id]}
                      {col === 'interview' && (
                        <p className="mt-1 text-[8px] text-primary sm:text-[9px]">Interview invite</p>
                      )}
                      {col !== 'offer' && (
                        <p className="mt-1 text-[8px] text-muted-foreground/70 sm:text-[9px]">
                          Click to advance →
                        </p>
                      )}
                    </motion.button>
                  ))}
              </AnimatePresence>
              {Object.values(cards).filter(c => c === col).length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-2 py-3 text-center text-[9px] text-muted-foreground/60 sm:py-4 sm:text-[10px]">
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
