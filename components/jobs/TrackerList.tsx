'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { cn, scoreColor } from '@/lib/utils'
import {
  applicationStatusClasses,
  applicationStatusLabel,
  normalizeApplicationStatus,
} from '@/lib/jobs/status'
import type { ApplicationTrackerItem } from '@/types'

interface TrackerListProps {
  items: ApplicationTrackerItem[]
  selectedJobId: string | null
  onSelect: (jobId: string) => void
}

/** Dense applications table — Teal CRM density, HireIQ tokens. */
export function TrackerList({ items, selectedJobId, onSelect }: TrackerListProps) {
  const groups = new Map<string, ApplicationTrackerItem[]>()
  for (const item of items) {
    const s = normalizeApplicationStatus(item.status)
    const list = groups.get(s) ?? []
    list.push(item)
    groups.set(s, list)
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-[720px]">
        <thead className="sticky top-0 z-10 bg-white dark:bg-card">
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Position</th>
            <th className="px-3 py-2.5 font-medium">Company</th>
            <th className="px-3 py-2.5 font-medium hidden md:table-cell">Location</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Saved</th>
            <th className="px-4 py-2.5 font-medium text-right">Match</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(groups.entries()).map(([status, rows]) => (
            <Fragment key={status}>
              <tr className="bg-[#f6f7f9] dark:bg-secondary/40">
                <td colSpan={6} className="px-4 py-1.5 text-xs font-medium text-foreground">
                  {applicationStatusLabel(status)}
                  <span className="text-muted-foreground font-normal ml-1.5">
                    {rows.length}
                  </span>
                </td>
              </tr>
              {rows.map(item => {
                const selected = selectedJobId === item.job_id
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelect(item.job_id)}
                    className={cn(
                      'border-b border-border/60 cursor-pointer transition-colors',
                      selected ? 'bg-secondary/60' : 'hover:bg-[#f6f7f9] dark:hover:bg-secondary/30'
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground max-w-[260px]">
                      <span className="line-clamp-1">{item.job.title}</span>
                    </td>
                    <td className="px-3 py-3 text-foreground/80 max-w-[180px]">
                      <span className="line-clamp-1">{item.job.company}</span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground max-w-[140px] hidden md:table-cell">
                      <span className="line-clamp-1">{item.job.location || '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium',
                          applicationStatusClasses(item.status)
                        )}
                      >
                        {applicationStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground tabular-nums text-xs whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.score != null ? (
                        <span className={cn('font-semibold tabular-nums text-sm', scoreColor(item.score))}>
                          {item.score}%
                        </span>
                      ) : (
                        <Link
                          href={`/dashboard/tracker/${item.job_id}?tab=documents`}
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={e => e.stopPropagation()}
                        >
                          Match
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
