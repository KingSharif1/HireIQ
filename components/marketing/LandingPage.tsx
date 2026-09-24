'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ScrollParallaxBackground } from '@/components/marketing/ScrollParallaxBackground'
import { ProductScrollStory } from '@/components/marketing/ProductScrollStory'
import { MatchStage } from '@/components/marketing/MatchStage'
import { CinematicFooter } from '@/components/marketing/CinematicFooter'
import { useMotionPreference } from '@/components/marketing/useMotionPreference'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

const ease = [0.22, 1, 0.36, 1] as const

const WORKFLOW_STEPS = [
  {
    label: 'Paste the URL',
    body: 'Bring any supported careers link. HireIQ extracts the posting—there is no built-in job search.',
  },
  {
    label: 'Build the evidence',
    body: 'Your master resume and GitHub projects supply the facts.',
  },
  {
    label: 'Tailor and apply',
    body: 'Review resume changes, then Auto-apply submits eligible forms.',
  },
  {
    label: 'Track every reply',
    body: 'Gmail or your HireIQ application email keeps each role current.',
  },
]

const PRIMARY_CTA_CLASS =
  'inline-flex items-center justify-center rounded-xl border border-primary bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[4px_4px_0_hsl(var(--ink-shadow)/0.3)] transition hover:-translate-y-px hover:shadow-[5px_5px_0_hsl(var(--ink-shadow)/0.3)] motion-safe:active:translate-x-px motion-safe:active:translate-y-px'

export function LandingPage() {
  const { reduceMotion: reduce } = useMotionPreference()
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 56])
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.55])

  return (
    <div className="marketing relative min-h-screen overflow-x-hidden">
      <ScrollParallaxBackground className="fixed inset-0 z-0" />

      <header className="relative z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.svg"
              alt=""
              width={36}
              height={36}
              className="rounded-xl ring-1 ring-border"
            />
            <span className="font-display text-xl font-semibold tracking-tight text-foreground">
              HireIQ
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm sm:gap-4">
            <a
              href="#how"
              className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Product
            </a>
            <ThemeToggle />
            <Link
              href="/signup"
              className="rounded-xl border border-primary bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-[3px_3px_0_hsl(var(--ink-shadow)/0.25)] transition hover:-translate-y-px"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section
          ref={heroRef}
          className="relative flex min-h-[min(100svh,920px)] flex-col justify-center border-b border-border pb-14 pt-10 md:pb-20 md:pt-12"
        >
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="mx-auto w-full max-w-6xl px-4 md:px-6">
            <div className="grid items-center gap-10 md:grid-cols-12 md:gap-8 md:items-end">
              <div className="md:col-span-7">
                <motion.p
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease }}
                  className="poster-kicker mb-4 text-primary"
                >
                  HireIQ
                </motion.p>
                <motion.h1
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.05, ease }}
                  className="font-display text-[clamp(2.35rem,8vw,5rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-foreground"
                >
                  The job-search desk that
                  <br />
                  <span className="relative inline-block">
                    finishes the paperwork.
                    <svg
                      aria-hidden
                      viewBox="0 0 320 12"
                      preserveAspectRatio="none"
                      className="absolute -bottom-1.5 left-0 h-2.5 w-full text-primary md:-bottom-2 md:h-3"
                      fill="none"
                    >
                      <path
                        d="M4 8 C 58 3, 128 10, 190 6 S 288 4, 316 7"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </motion.h1>
                <motion.p
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease }}
                  className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base md:text-lg"
                >
                  Paste a job URL. HireIQ extracts the role, rewrites your resume from your
                  master profile and GitHub, applies through the extension, and logs every
                  response.
                </motion.p>
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.16, ease }}
                  className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <Link href="/signup" className={PRIMARY_CTA_CLASS}>
                    Start with a job URL
                  </Link>
                  <a
                    href="#how"
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-card/70 px-6 py-3 text-sm font-semibold text-foreground shadow-[3px_3px_0_hsl(var(--ink-shadow)/0.14)] transition hover:-translate-y-px hover:bg-card"
                  >
                    See how it works
                  </a>
                </motion.div>
              </div>

              <motion.div
                initial={reduce ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.12, ease }}
                className="md:col-span-5"
              >
                <MatchStage />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.7 }}
            className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
              Scroll
            </span>
            <span className="h-8 w-px bg-foreground/25" />
          </motion.div>
        </section>

        <div id="how" className="border-b border-border bg-secondary/50">
          <div className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-20">
            <p className="poster-kicker text-primary">How HireIQ works</p>
            <h2 className="font-display mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              From job URL to tailored resume to submitted application.
            </h2>
          </div>
          <WorkflowRoute reduce={!!reduce} />
          <ProductScrollStory />
        </div>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease }}
            className="grid gap-8 md:grid-cols-12 md:gap-8"
          >
            <div className="md:col-span-5">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                What HireIQ is for
              </h2>
            </div>
            <div className="space-y-4 leading-relaxed text-muted-foreground md:col-span-7">
              <p>
                <strong className="font-medium text-foreground">HireIQ</strong> is a job-search
                workspace for people who already found a role and want to apply with a
                stronger, job-specific resume. It uses your master profile and GitHub
                evidence, shows every proposed resume change, and keeps the application record
                in one place.
              </p>
              <p>
                HireIQ is not a job board. You bring the job URL. Auto-apply submits eligible
                public forms when you choose a role; CAPTCHA, missing answers, unsupported
                sites, and account portals pause for you. Gmail or a HireIQ application email
                keeps employer replies attached to the job.
              </p>
            </div>
          </motion.div>
        </section>

        <ClosingFinale reduce={!!reduce} />
      </main>

      <CinematicFooter />
    </div>
  )
}

function WorkflowRoute({ reduce }: { reduce: boolean }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-2 pt-10 md:px-6 md:pt-12">
      <div className="relative">
        <motion.div
          aria-hidden
          initial={reduce ? false : { scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.8, ease }}
          className="absolute bottom-6 left-4 top-6 w-px origin-top bg-border md:hidden"
        />
        <motion.div
          aria-hidden
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.8, ease }}
          className="absolute left-4 right-4 top-4 hidden h-px origin-left bg-border md:block"
        />
        <ol className="grid gap-8 md:grid-cols-4 md:gap-6">
          {WORKFLOW_STEPS.map((step, i) => (
            <motion.li
              key={step.label}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease }}
              className="relative flex gap-4 md:flex-col"
            >
              <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card font-display text-xs font-bold text-primary shadow-[2px_2px_0_hsl(var(--ink-shadow)/0.15)]">
                {i + 1}
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-foreground md:mt-3">
                  {step.label}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function ClosingFinale({ reduce }: { reduce: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="ink-hatch pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center md:px-6 md:py-32">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease }}
          className="poster-kicker text-primary"
        >
          HireIQ
        </motion.p>

        <motion.h2
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.65, delay: 0.05, ease }}
          className="font-display mt-4 max-w-3xl text-[clamp(2rem,6vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-foreground"
        >
          Less paperwork.
          <br />
          <span className="relative inline-block">
            More interviews.
            <svg
              aria-hidden
              viewBox="0 0 300 12"
              preserveAspectRatio="none"
              className="absolute -bottom-1.5 left-0 h-2.5 w-full text-primary"
              fill="none"
            >
              <path
                d="M4 8 C 54 3, 120 10, 178 6 S 268 4, 296 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </motion.h2>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, delay: 0.1, ease }}
          className="mx-auto mt-5 max-w-md text-muted-foreground"
        >
          Bring the job. HireIQ handles the application trail—from tailored resume to reply.
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, delay: 0.16, ease }}
          className="mt-10"
        >
          <Link href="/signup" className={PRIMARY_CTA_CLASS}>
            Start with a job URL
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
