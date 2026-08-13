'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ScrollParallaxBackground } from '@/components/marketing/ScrollParallaxBackground'
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
  const heroY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 56])
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.55])

  return (
    <div className="marketing relative min-h-screen overflow-x-hidden">
      <ScrollParallaxBackground className="fixed inset-0 z-0" />

      <header className="relative z-30 border-b border-white/5 bg-[#070f1a]/55 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 md:px-6">
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
          <nav className="flex items-center gap-3 text-sm sm:gap-4">
            <a
              href="#how"
              className="hidden text-[var(--mk-mist)] transition-colors hover:text-white sm:inline"
            >
              Product
            </a>
            <Link
              href="/signup"
              className="rounded-xl bg-teal-400 px-4 py-2 font-semibold text-[#042f2e] shadow-lg shadow-teal-900/30 transition hover:bg-teal-300"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section
          ref={heroRef}
          className="relative flex min-h-[min(100svh,920px)] flex-col justify-center border-b border-white/5 pb-14 pt-10 md:pb-20 md:pt-12"
        >
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="mx-auto w-full max-w-6xl px-4 md:px-6">
            <div className="grid items-center gap-10 md:grid-cols-12 md:gap-8 md:items-end">
              <div className="md:col-span-7">
                <motion.p
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease }}
                  className="font-display mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-teal-300 sm:text-sm"
                >
                  HireIQ
                </motion.p>
                <motion.h1
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.05, ease }}
                  className="font-display text-[clamp(2.35rem,8vw,5rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-white"
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
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease }}
                  className="mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--mk-mist)] sm:text-base md:text-lg"
                >
                  <strong className="font-medium text-white">HireIQ</strong> helps you tailor a
                  resume to each role, autofill application forms with the Chrome extension, and
                  track every application — so you spend less time on paperwork and more time
                  interviewing.
                </motion.p>
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.16, ease }}
                  className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-xl bg-teal-400 px-6 py-3 text-sm font-semibold text-[#042f2e] shadow-[0_0_40px_-8px_rgba(45,212,191,0.55)] transition hover:bg-teal-300"
                  >
                    Get started
                  </Link>
                  <a
                    href="#how"
                    className="inline-flex items-center justify-center px-1 py-2 text-sm font-medium text-[var(--mk-mist)] underline-offset-4 transition hover:text-white hover:underline sm:px-3"
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
                <div className="relative mx-auto max-w-md md:max-w-none">
                  <div className="absolute -inset-4 rounded-[2rem] bg-teal-500/10 blur-3xl md:-inset-6" />
                  <MatchStage />
                </div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.7 }}
            className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">Scroll</span>
            <span className="h-8 w-px bg-gradient-to-b from-teal-400/50 to-transparent" />
          </motion.div>
        </section>

        <div id="how" className="border-b border-white/5 bg-black/25">
          <div className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-20">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.24em] text-teal-300/80">
              How HireIQ works
            </p>
            <h2 className="font-display mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
              From job post to filled form to follow-up — without the busywork.
            </h2>
          </div>
          <ProductScrollStory />
        </div>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="grid gap-8 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-5">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                What HireIQ is for
              </h2>
            </div>
            <div className="space-y-4 text-[var(--mk-mist)] leading-relaxed md:col-span-7">
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

        <ClosingFinale reduce={!!reduce} />
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-xs text-[var(--mk-mist)] sm:flex-row sm:items-center sm:justify-between md:px-6">
          <span>© {new Date().getFullYear()} HireIQ</span>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms of Service
            </Link>
            <Link href="/login" className="transition hover:text-white">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ClosingFinale({ reduce }: { reduce: boolean }) {
  return (
    <section className="relative overflow-hidden border-t border-white/5">
      {/* Intense bottom aurora — sits on top of fixed page BG */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 1.1, ease }}
          className="absolute left-1/2 top-[55%] h-[min(90vw,720px)] w-[min(90vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.35),rgba(13,148,136,0.12)_45%,transparent_68%)] blur-2xl"
        />
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.2, delay: 0.1, ease }}
          className="absolute left-1/2 top-[58%] h-[min(70vw,520px)] w-[min(70vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300/25"
        />
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.3, delay: 0.18, ease }}
          className="absolute left-1/2 top-[58%] h-[min(88vw,680px)] w-[min(88vw,680px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10"
        />
        {!reduce && (
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-[58%] h-[min(55vw,420px)] w-[min(55vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-400/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
            style={{
              borderStyle: 'dashed',
            }}
          />
        )}
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center md:px-6 md:py-32">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease }}
          className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-teal-300"
        >
          HireIQ
        </motion.p>

        <motion.h2
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.65, delay: 0.05, ease }}
          className="font-display mt-4 max-w-3xl text-[clamp(2rem,6vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-white"
        >
          Less paperwork.
          <br />
          <span className="bg-gradient-to-br from-teal-200 via-teal-300 to-cyan-200 bg-clip-text text-transparent">
            More interviews.
          </span>
        </motion.h2>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, delay: 0.1, ease }}
          className="mx-auto mt-5 max-w-md text-[var(--mk-mist)]"
        >
          Upload a resume, tailor it to a role, and keep every application in one place.
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, delay: 0.16, ease }}
          className="mt-10"
        >
          <Link
            href="/signup"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-teal-400 px-8 py-3.5 text-sm font-semibold text-[#042f2e] shadow-[0_0_60px_-10px_rgba(45,212,191,0.75)] transition hover:bg-teal-300"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition duration-700 group-hover:translate-x-full" />
            <span className="relative">Get started</span>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
