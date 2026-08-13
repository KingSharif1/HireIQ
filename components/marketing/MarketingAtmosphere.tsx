'use client'

import { cn } from '@/lib/utils'

/** Shared ink atmosphere for landing + auth. */
export function MarketingAtmosphere({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_-10%,rgba(13,148,136,0.28),transparent_55%),radial-gradient(90%_70%_at_95%_10%,rgba(45,212,191,0.12),transparent_50%),radial-gradient(80%_60%_at_50%_100%,rgba(12,26,46,0.9),transparent_55%)]" />
      <div className="absolute -left-24 top-16 h-[28rem] w-[28rem] rounded-full bg-teal-500/20 blur-[100px] animate-mk-drift" />
      <div className="absolute -right-16 bottom-0 h-[22rem] w-[22rem] rounded-full bg-cyan-400/10 blur-[90px] animate-mk-drift [animation-delay:-7s]" />
      <div className="marketing-grain" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(7,15,26,0.35)_70%,rgba(7,15,26,0.85))]" />
    </div>
  )
}
