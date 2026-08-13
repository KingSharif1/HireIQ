'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { MarketingAtmosphere } from '@/components/marketing/MarketingAtmosphere'

interface AuthShellProps {
  title: string
  description: string
  children: React.ReactNode
  tagline?: string
}

export function AuthShell({ title, description, children, tagline }: AuthShellProps) {
  const reduce = useReducedMotion()

  return (
    <div className="marketing relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <MarketingAtmosphere />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md space-y-6"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="" width={40} height={40} className="rounded-xl shadow-lg shadow-teal-950/50" />
            <span className="font-display text-2xl font-semibold tracking-tight text-white">HireIQ</span>
          </Link>
          {tagline && <p className="max-w-xs text-sm text-[var(--mk-mist)]">{tagline}</p>}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[var(--mk-panel)] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
          <div className="mb-5 space-y-1">
            <h1 className="font-display text-xl font-semibold text-white">{title}</h1>
            <p className="text-sm text-[var(--mk-mist)]">{description}</p>
          </div>
          <div className="auth-marketing-form space-y-4">{children}</div>
        </div>
      </motion.div>
    </div>
  )
}
