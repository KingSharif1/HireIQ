'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn, scoreColor } from '@/lib/utils'
import {
  APPLICATION_STATUSES,
  applicationStatusClasses,
  normalizeApplicationStatus,
} from '@/lib/jobs/status'
import type { ApplicationStatus, ApplicationTrackerItem } from '@/types'

interface TrackerBoardProps {
  items: ApplicationTrackerItem[]
  selectedJobId: string | null
  savingId?: string | null
  onSelect: (jobId: string) => void
  onStatusChange: (applicationId: string, status: ApplicationStatus) => Promise<void>
}

export function TrackerBoard({
  items,
  selectedJobId,
  savingId = null,
  onSelect,
  onStatusChange,
}: TrackerBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStatus, setOverStatus] = useState<ApplicationStatus | null>(null)

  async function dropOn(status: ApplicationStatus) {
    if (!draggingId) return
    const item = items.find(i => i.id === draggingId)
    setOverStatus(null)
    setDraggingId(null)
    if (!item || normalizeApplicationStatus(item.status) === status) return
    await onStatusChange(item.id, status)
  }

  return (
    <div className="flex gap-2.5 sm:gap-3 overflow-x-auto overflow-y-hidden h-full min-h-0 pb-1 snap-x snap-mandatory overscroll-x-contain">
      {APPLICATION_STATUSES.map(col => {
        const columnItems = items.filter(i => normalizeApplicationStatus(i.status) === col.value)
        const isOver = overStatus === col.value
        return (
          <div
            key={col.value}
            data-kanban-drop-status={col.value}
            className={cn(
              'snap-start flex-shrink-0 w-[min(248px,78vw)] sm:w-[260px] rounded-xl border flex flex-col h-full min-h-0 transition-[border-color,background-color] duration-150',
              isOver
                ? 'border-foreground/50 bg-white dark:bg-card shadow-sm'
                : 'border-border/80 bg-white/70 dark:bg-card/50'
            )}
            onDragOver={e => {
              e.preventDefault()
              setOverStatus(col.value)
            }}
            onDragLeave={() => {
              if (overStatus === col.value) setOverStatus(null)
            }}
            onDrop={e => {
              e.preventDefault()
              void dropOn(col.value)
            }}
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/70 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    'inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium truncate',
                    applicationStatusClasses(col.value)
                  )}
                >
                  {col.label}
                </span>
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground font-medium">
                {columnItems.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-2 min-h-0 bg-[#f6f7f9]/80 dark:bg-secondary/20 rounded-b-xl">
              {columnItems.length === 0 ? (
                <div className="h-full min-h-[72px] flex items-center justify-center">
                  <p className="text-[11px] text-muted-foreground/80">Drop here</p>
                </div>
              ) : (
                columnItems.map(item => {
                  const busy = savingId === item.id
                  return (
                    <article
                      key={item.id}
                      draggable={!busy}
                      onDragStart={() => setDraggingId(item.id)}
                      onDragEnd={() => {
                        setDraggingId(null)
                        setOverStatus(null)
                      }}
                      onClick={() => onSelect(item.job_id)}
                      className={cn(
                        'rounded-lg border bg-white dark:bg-card p-3 cursor-grab active:cursor-grabbing touch-manipulation transition-opacity duration-150',
                        'hover:border-foreground/25',
                        selectedJobId === item.job_id
                          ? 'border-foreground/40 ring-1 ring-foreground/10'
                          : 'border-border/80',
                        draggingId === item.id && 'opacity-40',
                        busy && 'opacity-60 pointer-events-none'
                      )}
                    >
                      <p className="text-[13px] font-medium text-foreground line-clamp-2 leading-snug">
                        {item.job.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">
                        {item.job.company}
                      </p>
                      <div className="flex items-center justify-between mt-2.5 gap-2 pt-2 border-t border-border/60">
                        <Link
                          href={`/dashboard/tracker/${item.job_id}?tab=documents`}
                          className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
                          onClick={e => e.stopPropagation()}
                        >
                          Tailor
                        </Link>
                        {item.score != null ? (
                          <span className={cn('text-[11px] font-semibold tabular-nums', scoreColor(item.score))}>
                            {item.score}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/70">—</span>
                        )}
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
