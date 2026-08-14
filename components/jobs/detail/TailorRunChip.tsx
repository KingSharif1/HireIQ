'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  isBusyTailorStatus,
  tailorDocumentsHref,
  tailorRunLabel,
  type TailorRunStatus,
} from '@/lib/tailor/run-types'

export function TailorRunChip({
  status,
  jobId,
  className,
  onOpen,
}: {
  status: TailorRunStatus | null | undefined
  jobId?: string
  className?: string
  onOpen?: () => void
}) {
  const label = tailorRunLabel(status)
  if (!label || !status || status === 'failed') return null

  const busy = isBusyTailorStatus(status)
  const classes = cn(
    'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium',
    busy &&
      'border-teal-700/25 bg-teal-50 text-teal-900 dark:border-teal-400/25 dark:bg-teal-950/40 dark:text-teal-100',
    status === 'awaiting_answers' &&
      'border-amber-700/25 bg-amber-50 text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/40 dark:text-amber-100',
    status === 'needs_review' &&
      'border-foreground/20 bg-secondary text-foreground',
    className,
  )

  const inner = (
    <>
      {busy ? (
        <span
          className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current"
          aria-hidden
        />
      ) : null}
      {label}
    </>
  )

  if (onOpen) {
    return (
      <button type="button" className={classes} onClick={onOpen}>
        {inner}
      </button>
    )
  }

  if (jobId) {
    return (
      <Link
        href={tailorDocumentsHref(jobId)}
        className={classes}
        onClick={event => event.stopPropagation()}
      >
        {inner}
      </Link>
    )
  }

  return <span className={classes}>{inner}</span>
}
