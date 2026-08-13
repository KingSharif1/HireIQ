'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Briefcase, FileText, Puzzle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExtensionConnectPanel } from '@/components/home/ExtensionConnectPanel'

const ACTIONS: {
  href: string
  title: string
  description: string
  icon: typeof FileText
  accent: string
}[] = [
  {
    href: '/dashboard/tracker',
    title: 'Applications',
    description: 'Track roles, statuses, and outreach in one board.',
    icon: Briefcase,
    accent: 'from-teal-500/15 to-transparent',
  },
  {
    href: '/dashboard/builder',
    title: 'Resume Builder',
    description: 'Edit your master resume and export tailored versions.',
    icon: FileText,
    accent: 'from-cyan-500/12 to-transparent',
  },
]

interface HomeTilesProps {
  firstName?: string | null
}

export function HomeTiles({ firstName }: HomeTilesProps) {
  const reduce = useReducedMotion()
  const greeting = firstName?.trim() ? `Welcome back, ${firstName.trim()}` : 'Welcome back'

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">
          HireIQ
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {greeting}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
          Tailor a resume, autofill applications with the extension, and keep every role organized.
        </p>
      </motion.header>

      <div className="grid gap-3 md:grid-cols-2">
        {ACTIONS.map((action, i) => {
          const Icon = action.icon
          return (
            <motion.div
              key={action.href}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                href={action.href}
                className={cn(
                  'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition',
                  'hover:border-teal-500/35 hover:shadow-md hover:shadow-teal-900/5',
                )}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80',
                    action.accent,
                  )}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/10 text-teal-800 dark:text-teal-200">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal-700 dark:group-hover:text-teal-300" />
                </div>
                <h2 className="relative mt-4 font-display text-lg font-semibold text-foreground">
                  {action.title}
                </h2>
                <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {action.description}
                </p>
              </Link>
            </motion.div>
          )
        })}
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4"
      >
        <Link
          href="#chrome-extension"
          className="group flex items-center gap-4 rounded-2xl border border-dashed border-teal-500/30 bg-teal-500/[0.06] px-5 py-4 transition hover:border-teal-500/50 hover:bg-teal-500/10"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-900/20">
            <Puzzle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-semibold text-foreground">Chrome extension</p>
            <p className="text-sm text-muted-foreground">
              Connect once, then autofill job forms from your HireIQ profile.
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-teal-700 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-teal-300" />
        </Link>
      </motion.div>

      <ExtensionConnectPanel />
    </div>
  )
}
