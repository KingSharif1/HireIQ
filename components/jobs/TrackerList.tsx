'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { cn, scoreColor } from '@/lib/utils'
import {
  applicationStatusClasses,
  applicationStatusLabel,
  normalizeApplicationStatus,
} from '@/lib/jobs/status'
import { TailorRunChip } from '@/components/jobs/detail/TailorRunChip'
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
    <>
      {/* Phones: stacked rows so status, next step and match stay visible at 390px. */}
      <div className="sm:hidden">
        {Array.from(groups.entries()).map(([status, rows]) => (
          <section key={status} aria-label={applicationStatusLabel(status)}>
            <p className="bg-secondary/50 px-4 py-1.5 text-xs font-medium text-foreground">
              {applicationStatusLabel(status)}
              <span className="ml-1.5 font-normal text-muted-foreground">{rows.length}</span>
            </p>
            <ul>
              {rows.map(item => (
                <li key={item.id} className="border-b border-border/60">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(item.job_id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect(item.job_id)
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      selectedJobId === item.job_id ? 'bg-secondary/60' : 'active:bg-secondary/40'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">{item.job.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {[item.job.company, item.job.location].filter(Boolean).join(' · ')}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium',
                            applicationStatusClasses(item.status)
                          )}
                        >
                          {applicationStatusLabel(item.status)}
                        </span>
                        {item.tailorRunStatus ? (
                          <TailorRunChip status={item.tailorRunStatus} jobId={item.job_id} />
                        ) : null}
                      </div>
                      {item.nextStep ? (
                        <p className="mt-1.5 line-clamp-1 text-xs text-foreground/80">Next: {item.nextStep}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      {item.score != null ? (
                        <span className={cn('text-sm font-semibold tabular-nums', scoreColor(item.score))}>
                          {item.score}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No resume</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="hidden w-full overflow-x-auto sm:block">
        <table className="w-full text-sm border-collapse min-w-[720px]">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Position</th>
              <th className="px-3 py-2.5 font-medium">Company</th>
              <th className="px-3 py-2.5 font-medium hidden md:table-cell">Location</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium hidden lg:table-cell">Next step</th>
              <th className="px-3 py-2.5 font-medium">Saved</th>
              <th className="px-4 py-2.5 font-medium text-right">Match</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(groups.entries()).map(([status, rows]) => (
              <Fragment key={status}>
                <tr className="bg-secondary/50">
                  <td colSpan={7} className="px-4 py-1.5 text-xs font-medium text-foreground">
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
                        selected ? 'bg-secondary/60' : 'hover:bg-secondary/40'
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-foreground max-w-[260px]">
                        <span className="line-clamp-1">{item.job.title}</span>
                        {item.tailorRunStatus ? (
                          <span className="mt-1 block">
                            <TailorRunChip status={item.tailorRunStatus} jobId={item.job_id} />
                          </span>
                        ) : null}
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
                      <td className="px-3 py-3 text-xs text-foreground/80 max-w-[200px] hidden lg:table-cell">
                        <span className="line-clamp-1">{item.nextStep ?? '—'}</span>
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
                            Tailor
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
    </>
  )
}
