'use client'

import { useRef } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'

/** Sticky scrollytelling: tailor → extension → tracker. */
export function ProductScrollStory() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })
  const reduce = useReducedMotion()

  return (
    <section ref={ref} className="relative h-[280vh]" aria-label="How HireIQ works">
      <div className="sticky top-0 flex min-h-[100svh] items-center overflow-hidden py-14 md:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 md:grid-cols-12 md:items-center md:gap-10 md:px-6">
          <div className="relative z-10 space-y-8 md:col-span-5 md:space-y-12">
            <Chapter
              progress={scrollYProgress}
              range={[0, 0.32]}
              label="Tailor"
              title="Rewrite the resume for the role — you approve every change."
              body="HireIQ compares your master resume to the job description, then proposes edits with tracked changes. Accept, decline, or rewrite before you export."
            />
            <Chapter
              progress={scrollYProgress}
              range={[0.32, 0.62]}
              label="Extension"
              title="Stop retyping the same application forms."
              body="The Chrome extension pulls your HireIQ profile and tailored answers into Greenhouse, Lever, and similar boards — paperwork automation without sending applications for you."
            />
            <Chapter
              progress={scrollYProgress}
              range={[0.62, 1]}
              label="Track"
              title="One board for every application you actually sent."
              body="Saved jobs, statuses, notes, and optional email updates live in HireIQ so you always know what’s waiting on a reply."
            />
          </div>

          <div className="relative md:col-span-7">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-xl md:max-w-none md:aspect-[5/4]">
              {reduce ? (
                <TailorWorkbench />
              ) : (
                <>
                  <StageLayer progress={scrollYProgress} show={[0, 0.38]}>
                    <TailorWorkbench />
                  </StageLayer>
                  <StageLayer progress={scrollYProgress} show={[0.32, 0.68]}>
                    <ExtensionWorkbench />
                  </StageLayer>
                  <StageLayer progress={scrollYProgress} show={[0.62, 1]}>
                    <TrackerWorkbench />
                  </StageLayer>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Chapter({
  progress,
  range,
  label,
  title,
  body,
}: {
  progress: MotionValue<number>
  range: [number, number]
  label: string
  title: string
  body: string
}) {
  const opacity = useTransform(
    progress,
    [range[0], range[0] + 0.05, range[1] - 0.05, range[1]],
    [0.22, 1, 1, 0.22],
  )
  const y = useTransform(progress, [range[0], range[0] + 0.07], [16, 0])

  return (
    <motion.div style={{ opacity, y }} className="max-w-md">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-teal-300/90">
        {label}
      </p>
      <h3 className="font-display mt-2 text-2xl font-semibold leading-tight text-white md:text-[1.65rem]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--mk-mist)] md:text-[15px]">{body}</p>
    </motion.div>
  )
}

function StageLayer({
  children,
  progress,
  show,
}: {
  children: React.ReactNode
  progress: MotionValue<number>
  show: [number, number]
}) {
  const opacity = useTransform(
    progress,
    [show[0] - 0.03, show[0] + 0.02, show[1] - 0.02, show[1] + 0.03],
    [0, 1, 1, 0],
  )
  const scale = useTransform(progress, [show[0], show[0] + 0.08], [0.97, 1])
  const y = useTransform(progress, [show[0], show[0] + 0.1], [24, 0])

  return (
    <motion.div style={{ opacity, scale, y }} className="absolute inset-0 will-change-transform">
      {children}
    </motion.div>
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
      <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-2 flex-1 truncate text-xs text-[var(--mk-mist)]">{title}</span>
        {badge && (
          <span className="rounded-md bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-300">
            {badge}
          </span>
        )}
      </div>
      <div className="relative min-h-0 flex-1 p-3 sm:p-4">{children}</div>
    </div>
  )
}

function TailorWorkbench() {
  return (
    <Shell title="HireIQ — Job matcher" badge="Tailor">
      <div className="grid h-full grid-cols-2 gap-3">
        <div className="rounded-xl bg-[var(--mk-paper)] p-3 text-[#0c1829] shadow-inner">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5a6b7c]">Resume</p>
          <div className="mt-2 space-y-1.5">
            <div className="h-2 w-2/3 rounded-full bg-[#0c1829]/12" />
            <p className="text-[11px] leading-snug text-[#334155]">
              Built React dashboards for ops teams…
            </p>
            <motion.p
              className="rounded bg-teal-100/80 px-1.5 py-1 text-[11px] leading-snug text-teal-900 ring-1 ring-teal-400/40"
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              + Led TypeScript migrations across 4 product squads
            </motion.p>
            <div className="h-1.5 w-full rounded-full bg-[#0c1829]/08" />
            <div className="h-1.5 w-4/5 rounded-full bg-[#0c1829]/08" />
          </div>
        </div>
        <div className="flex flex-col rounded-xl border border-white/10 bg-[#0e1c30] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--mk-mist)]">
            Job · Staff Frontend
          </p>
          <div className="mt-3 space-y-2">
            {['TypeScript', 'System design', 'Mentorship'].map((k, i) => (
              <motion.div
                key={k}
                initial={{ width: '40%' }}
                animate={{ width: ['40%', '92%', '78%'] }}
                transition={{ duration: 2.8, delay: i * 0.25, repeat: Infinity, repeatDelay: 1 }}
                className="flex items-center gap-2"
              >
                <span className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-teal-400 to-teal-400/20" />
                <span className="w-16 text-right text-[10px] text-teal-200/80">{k}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-auto flex items-end justify-between pt-4">
            <span className="text-[10px] text-[var(--mk-mist)]">Match</span>
            <span className="font-display text-3xl font-bold text-teal-300">87%</span>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function ExtensionWorkbench() {
  return (
    <Shell title="careers.example.com / apply" badge="Extension">
      <div className="relative grid h-full grid-cols-[1fr_0.85fr] gap-2 overflow-hidden rounded-xl bg-[#f4f6f8]">
        <div className="space-y-2 overflow-hidden p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Application form
          </p>
          {[
            ['Full name', 'Alex Rivera'],
            ['Email', 'alex@…'],
            ['Years of experience', '6'],
            ['Why this role?', 'Scaled design systems…'],
          ].map(([label, value], i) => (
            <div key={label} className="space-y-1">
              <p className="text-[9px] text-slate-500">{label}</p>
              <motion.div
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800"
                initial={{ opacity: 0.35 }}
                animate={{
                  opacity: 1,
                  boxShadow: [
                    '0 0 0 0 transparent',
                    '0 0 0 2px rgba(13,148,136,0.35)',
                    '0 0 0 0 transparent',
                  ],
                }}
                transition={{ delay: 0.35 + i * 0.35, duration: 0.9 }}
              >
                {value}
              </motion.div>
            </div>
          ))}
        </div>
        <motion.div
          className="m-2 flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0c1829] text-[9px] font-bold text-teal-300">
              IQ
            </span>
            <div>
              <p className="text-[11px] font-semibold text-slate-900">HireIQ</p>
              <p className="text-[9px] text-slate-500">Autofill ready</p>
            </div>
          </div>
          <div className="space-y-1.5 text-[10px] text-slate-600">
            <p className="rounded-md bg-teal-50 px-2 py-1 text-teal-800">Profile 100%</p>
            <p className="rounded-md bg-slate-50 px-2 py-1">Tailored resume attached</p>
            <p className="rounded-md bg-slate-50 px-2 py-1">4 answers filled</p>
          </div>
          <motion.div
            className="mt-auto rounded-lg bg-teal-500 py-2 text-center text-[11px] font-semibold text-[#042f2e]"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            Fill remaining fields
          </motion.div>
        </motion.div>
      </div>
    </Shell>
  )
}

function TrackerWorkbench() {
  const cols = [
    { name: 'Applied', cards: ['Acme · Frontend', 'Northwind · Fullstack'] },
    { name: 'Interview', cards: ['Orbit · Staff FE'] },
    { name: 'Offer', cards: [] as string[] },
  ]
  return (
    <Shell title="HireIQ — Applications" badge="Tracker">
      <div className="grid h-full grid-cols-3 gap-2">
        {cols.map((col, ci) => (
          <div key={col.name} className="rounded-xl bg-white/5 p-2">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--mk-mist)]">
              {col.name}
            </p>
            <div className="space-y-2">
              {col.cards.map((card, i) => (
                <motion.div
                  key={card}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + ci * 0.15 + i * 0.1 }}
                  className="rounded-lg border border-white/10 bg-[#122033] px-2.5 py-2 text-[11px] text-white/90 shadow-lg"
                >
                  {card}
                  {ci === 1 && (
                    <p className="mt-1 text-[9px] text-teal-300">Email: interview invite</p>
                  )}
                </motion.div>
              ))}
              {col.cards.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/10 px-2 py-4 text-center text-[10px] text-white/30">
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
