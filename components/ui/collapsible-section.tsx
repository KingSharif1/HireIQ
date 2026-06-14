'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  /** Optional small element rendered on the right of the header (e.g. a count). */
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * A header + animated collapsible body. Used for the Job Hub sidebar cards so
 * each section (Fit / Application / Details) can be folded away.
 */
export function CollapsibleSection({
  title,
  defaultOpen = true,
  aside,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {aside}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
