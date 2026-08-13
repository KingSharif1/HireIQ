'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { MarketingAtmosphere } from '@/components/marketing/MarketingAtmosphere'
import { ProductScrollStory } from '@/components/marketing/ProductScrollStory'
import { MatchStage } from '@/components/marketing/MatchStage'

const ease = [0.22, 1, 0.36, 1] as const

export function LandingPage() {
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, reduce ? 1 : 0.35])

  return (
    <div className="marketing relative min-h-screen overflow-x-hidden">
      <MarketingAtmosphere />
      {/* Architectural duotone grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse at 50% 20%, black 20%, transparent 75%)',
        }}
      />

      <header className="relative z-30 border-b border-white/5 bg-[#070f1a]/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.svg"
              alt=""
              width={36}
              height={36}
              className="rounded-xl shadow-lg shadow-teal-950/40"
            />
            <span className="font-display text-xl font-semibold tracking-tight text-white">HireIQ</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm sm:gap-3">
            <a
              href="#how"
              className="hidden text-[var(--mk-mist)] transition-colors hover:text-white sm:inline"
            >
              Product
            </a>
            <Link
              href="/privacy"
              className="hidden text-[var(--mk-mist)] transition-colors hover:text-white md:inline"
            >
              Privacy
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-[var(--mk-mist)] transition-colors hover:bg-white/5 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-teal-500 px-3.5 py-1.5 font-medium text-[#042f2e] shadow-lg shadow-teal-900/40 transition hover:bg-teal-400"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero — brand-first, cinematic */}
        <section
          ref={heroRef}
          className="relative flex min-h-[92svh] flex-col justify-center border-b border-white/5 pb-16 pt-10 md:pb-24 md:pt-14"
        >
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="mx-auto w-full max-w-6xl px-4 md:px-6">
            <div className="grid items-end gap-12 md:grid-cols-12 md:gap-8">
              <div className="md:col-span-7">
                <motion.p
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease }}
                  className="font-display mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-teal-300"
                >
                  HireIQ
                </motion.p>
                <motion.h1
                  initial={reduce ? false : { opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.06, ease }}
                  className="font-display text-[clamp(2.75rem,7vw,5.25rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-white"
                >
                  The job-search
                  <br />
                  <span className="text-white/35">desk that</span>
                  <br />
                  <span className="bg-gradient-to-br from-teal-200 via-teal-300 to-cyan-200 bg-clip-text text-transparent">
                    finishes the paperwork.
                  </span>
                </motion.h1>
                <motion.p
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, delay: 0.14, ease }}
                  className="mt-6 max-w-xl text-base leading-relaxed text-[var(--mk-mist)] md:text-lg"
                >
                  <strong className="font-medium text-white">HireIQ</strong> helps you tailor a
                  resume to each role, autofill application forms with the Chrome extension, and
                  track every application — so you spend less time on paperwork and more time
                  interviewing.
                </motion.p>
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.22, ease }}
                  className="mt-9 flex flex-wrap items-center gap-3"
                >
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-xl bg-teal-400 px-6 py-3 text-sm font-semibold text-[#042f2e] shadow-[0_0_40px_-8px_rgba(45,212,191,0.55)] transition hover:bg-teal-300"
                  >
                    Create free account
                  </Link>
                  <a
                    href="#how"
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10"
                  >
                    See how it works
                  </a>
                </motion.div>
              </div>

              <motion.div
                initial={reduce ? false : { opacity: 0, y: 36, rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 1, delay: 0.2, ease }}
                className="md:col-span-5"
              >
                <div className="relative">
                  <div className="absolute -inset-6 rounded-[2rem] bg-teal-500/10 blur-3xl" />
                  <MatchStage />
                </div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-white/35 md:block"
          >
            Scroll
          </motion.div>
        </section>

        {/* Product story */}
        <div id="how" className="border-b border-white/5 bg-black/25">
          <div className="mx-auto max-w-6xl px-4 pt-16 md:px-6 md:pt-20">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-teal-300/80">
              How HireIQ works
            </p>
            <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
              From job post to filled form to follow-up — without the busywork.
            </h2>
          </div>
          <ProductScrollStory />
        </div>

        {/* Explicit purpose — Google branding */}
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
          <div className="grid gap-10 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-5">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-white">
                What HireIQ is for
              </h2>
            </div>
            <div className="md:col-span-7 space-y-4 text-[var(--mk-mist)] leading-relaxed">
              <p>
                <strong className="text-white">HireIQ</strong> is a job-search workspace for people
                applying to roles. It helps you keep resumes accurate for each posting, automate
                repetitive application paperwork via the browser extension, and keep a reliable
                record of applications.
              </p>
              <p>
                HireIQ is not a job board and does not apply for you without your action. Optional
                Google and GitHub connections are used only for sign-in, read-only Gmail matching,
                and project suggestions — disconnect anytime in Settings.
              </p>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="relative overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_120%,rgba(13,148,136,0.22),transparent)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 text-center md:px-6 md:py-28">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white md:text-5xl">
              Ready to apply with HireIQ?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[var(--mk-mist)]">
              Create an account, upload your resume, and tailor your first role in minutes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex rounded-xl bg-teal-400 px-6 py-3 text-sm font-semibold text-[#042f2e] transition hover:bg-teal-300"
              >
                Create free account
              </Link>
              <Link
                href="/login"
                className="inline-flex rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/5"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-xs text-[var(--mk-mist)] sm:flex-row sm:items-center sm:justify-between md:px-6">
          <span>© {new Date().getFullYear()} HireIQ</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
