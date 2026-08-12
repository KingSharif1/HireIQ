'use client'

import Link from 'next/link'
import { Mail, ArrowUpRight, ArrowDownLeft, StickyNote, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  applicationStatusClasses,
  applicationStatusLabel,
  normalizeApplicationStatus,
} from '@/lib/jobs/status'
import type { OutreachItem } from '@/lib/applications/outreach'

type OutreachListProps = {
  items: OutreachItem[]
}

export function OutreachList({ items }: OutreachListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-12 h-12 rounded-2xl border border-border bg-white dark:bg-card flex items-center justify-center mb-4">
          <Inbox className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h3 className="font-semibold text-foreground">No outreach yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Log emails on a job’s Email tab — sent and received messages across all applications show up
          here.
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border bg-white dark:bg-card min-h-full">
      {items.map(item => (
        <li key={`${item.applicationId}-${item.id}`}>
          <Link
            href={`/dashboard/tracker/${item.jobId}?tab=email`}
            className="flex gap-3 px-4 py-3.5 no-underline transition-colors hover:bg-secondary/40"
          >
            <span
              className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border',
                item.direction === 'sent' && 'bg-secondary',
                item.direction === 'received' && 'bg-brand-green/10',
                item.direction === 'note' && 'bg-secondary/60'
              )}
              aria-hidden
            >
              {item.direction === 'sent' ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-foreground" />
              ) : item.direction === 'received' ? (
                <ArrowDownLeft className="h-3.5 w-3.5 text-brand-green" />
              ) : (
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{item.subject}</span>
                <span
                  className={cn(
                    'inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                    applicationStatusClasses(normalizeApplicationStatus(item.applicationStatus))
                  )}
                >
                  {applicationStatusLabel(normalizeApplicationStatus(item.applicationStatus))}
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground truncate">
                {item.company} · {item.jobTitle}
                <span className="mx-1.5 text-border">·</span>
                {directionLabel(item.direction)}
                <span className="mx-1.5 text-border">·</span>
                {formatWhen(item.at)}
              </span>
              {item.preview ? (
                <span className="mt-1 block text-sm text-muted-foreground line-clamp-2">
                  {item.preview}
                </span>
              ) : null}
            </span>
            <Mail className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function directionLabel(direction: OutreachItem['direction']): string {
  if (direction === 'sent') return 'Sent'
  if (direction === 'received') return 'Received'
  return 'Note'
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}
