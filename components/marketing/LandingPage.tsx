'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { MarketingAtmosphere } from '@/components/marketing/MarketingAtmosphere'
import { MatchStage } from '@/components/marketing/MatchStage'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] as const },
})

export function LandingPage() {
  const reduce = useReducedMotion()

  return (
    <div className="marketing relative min-h-screen overflow-x-hidden">
      <MarketingAtmosphere />

      <header className="relative z-20 border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="" width={36} height={36} className="rounded-xl shadow-lg shadow-teal-950/40" />
            <span className="font-display text-xl font-semibold tracking-tight text-white">HireIQ</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm sm:gap-3">
            <Link
              href="/privacy"
              className="hidden text-[var(--mk-mist)] transition-colors hover:text-white sm:inline"
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
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-2 md:gap-8 md:px-6 md:pb-24 md:pt-20">
          <div>
            <motion.p
              {...(reduce ? {} : fadeUp(0))}
              className="font-display mb-4 text-sm font-semibold tracking-[0.22em] text-teal-300/90 uppercase"
            >
              HireIQ
            </motion.p>
            <motion.h1
              {...(reduce ? {} : fadeUp(0.08))}
              className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-[3.25rem]"
            >
              Tailor your resume.
              <br />
              <span className="bg-gradient-to-r from-teal-200 via-teal-300 to-cyan-200 bg-clip-text text-transparent">
                Track every application.
              </span>
            </motion.h1>
            <motion.p
              {...(reduce ? {} : fadeUp(0.16))}
              className="mt-5 max-w-md text-base leading-relaxed text-[var(--mk-mist)] md:text-lg"
            >
              HireIQ is a job-search workspace: upload your resume, match it to each job description,
              track where you applied, and optionally sync employer email updates — so status changes
              show up in one place.
            </motion.p>
            <motion.div {...(reduce ? {} : fadeUp(0.24))} className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-teal-400 px-5 py-2.5 text-sm font-semibold text-[#042f2e] shadow-lg shadow-teal-900/50 transition hover:bg-teal-300"
              >
                Create free account
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10"
              >
                Sign in
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <MatchStage />
          </motion.div>
        </section>

        <section className="border-t border-white/5 bg-black/20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3 md:px-6 md:py-16">
            {[
              {
                title: 'Resume tailor',
                body: 'Parse your resume, compare it to a posting, and generate a tailored version with changes you control.',
              },
              {
                title: 'Application tracker',
                body: 'Save jobs from common ATS boards, log status and answers, then pick up exactly where you left off.',
              },
              {
                title: 'Email status',
                body: 'Optionally connect Gmail read-only or use a HireIQ apply address so confirmations land next to each job.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-2"
              >
                <h2 className="font-display text-lg font-semibold text-white">{item.title}</h2>
                <p className="text-sm leading-relaxed text-[var(--mk-mist)]">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-16">
          <h2 className="font-display text-2xl font-semibold text-white">What HireIQ is for</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-[var(--mk-mist)]">
            HireIQ helps people applying to jobs keep resumes accurate for each role and keep a
            reliable record of applications. It is not a job board and does not apply for you without
            your action. Optional Google and GitHub connections are used only for sign-in, read-only
            Gmail matching, and project suggestions — you can disconnect them anytime in Settings.
          </p>
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
