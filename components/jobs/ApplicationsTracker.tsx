'use client'

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, LayoutGrid, List, Mail, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrackerBoard } from '@/components/jobs/TrackerBoard'
import { TrackerList } from '@/components/jobs/TrackerList'
import { OutreachList } from '@/components/jobs/OutreachList'
import {
  APPLICATION_STATUSES,
  normalizeApplicationStatus,
} from '@/lib/jobs/status'
import { buildOutreachFeed, filterOutreachFeed, type UnmatchedInboundRow } from '@/lib/applications/outreach'
import { fetchActiveTailorRuns, type TailorRunDto } from '@/lib/api/client'
import { isBusyTailorStatus } from '@/lib/tailor/run-types'
import { cn } from '@/lib/utils'
import type { ApplicationEmailLogEntry, ApplicationStatus, ApplicationTrackerItem } from '@/types'

type ViewMode = 'list' | 'board'
type Surface = 'applications' | 'outreach'
type DirectionFilter = ApplicationEmailLogEntry['direction'] | 'all'

const VIEW_KEY = 'hireiq.tracker.view'
const SURFACE_KEY = 'hireiq.tracker.surface'

interface ApplicationsTrackerProps {
  initialItems: ApplicationTrackerItem[]
  initialSurface?: Surface
  unmatchedInbound?: UnmatchedInboundRow[]
}

export function ApplicationsTracker({
  initialItems,
  initialSurface = 'applications',
  unmatchedInbound = [],
}: ApplicationsTrackerProps) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [surface, setSurface] = useState<Surface>(initialSurface)
  const [view, setView] = useState<ViewMode>('list')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const hasBusyTailor = items.some(item => isBusyTailorStatus(item.tailorRunStatus ?? ''))

  useEffect(() => {
    if (!hasBusyTailor) return
    const tick = window.setInterval(() => {
      void fetchActiveTailorRuns()
        .then((runs: TailorRunDto[]) => {
          const byJob = new Map(runs.map(run => [run.job_id, run.status] as const))
          setItems(prev =>
            prev.map(item => ({
              ...item,
              tailorRunStatus: byJob.get(item.job_id) ?? (isBusyTailorStatus(item.tailorRunStatus ?? '') ? null : item.tailorRunStatus),
            })),
          )
        })
        .catch(() => undefined)
    }, 4000)
    return () => window.clearInterval(tick)
  }, [hasBusyTailor])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY)
      if (saved === 'list' || saved === 'board') setView(saved)
      if (initialSurface === 'applications') {
        const savedSurface = localStorage.getItem(SURFACE_KEY)
        if (savedSurface === 'applications' || savedSurface === 'outreach') {
          setSurface(savedSurface)
        }
      }
    } catch {
      /* ignore */
    }
  }, [initialSurface])

  function changeSurface(next: Surface) {
    startTransition(() => setSurface(next))
    setQuery('')
    try {
      localStorage.setItem(SURFACE_KEY, next)
      const url = next === 'outreach' ? '/dashboard/tracker?view=outreach' : '/dashboard/tracker'
      router.replace(url, { scroll: false })
    } catch {
      /* ignore */
    }
  }

  function changeView(next: ViewMode) {
    startTransition(() => setView(next))
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const statusCounts = useMemo(() => {
    return APPLICATION_STATUSES.reduce<Record<string, number>>((acc, s) => {
      acc[s.value] = items.filter(i => normalizeApplicationStatus(i.status) === s.value).length
      return acc
    }, {})
  }, [items])

  const visibleJobs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(i => {
      if (statusFilter !== 'all' && normalizeApplicationStatus(i.status) !== statusFilter) {
        return false
      }
      if (!q) return true
      return (
        i.job.title.toLowerCase().includes(q) ||
        i.job.company.toLowerCase().includes(q) ||
        (i.job.location?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [items, statusFilter, query])

  const outreachAll = useMemo(
    () => buildOutreachFeed(items, unmatchedInbound),
    [items, unmatchedInbound],
  )
  const visibleOutreach = useMemo(
    () => filterOutreachFeed(outreachAll, { query, direction: directionFilter }),
    [outreachAll, query, directionFilter]
  )

  function openJob(jobId: string) {
    router.push(`/dashboard/tracker/${jobId}`)
  }

  /** Optimistic local update + PATCH — no page refetch. */
  async function handleStatusChange(applicationId: string, status: ApplicationStatus) {
    setError(null)
    const previous = items
    setSavingId(applicationId)
    setItems(prev =>
      prev.map(i =>
        i.id === applicationId
          ? { ...i, status, updated_at: new Date().toISOString() }
          : i
      )
    )

    try {
      const res = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, meta: { via: 'tracker' } }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || 'Failed to update status')
      }
    } catch (err) {
      setItems(previous)
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setSavingId(null)
    }
  }

  const isOutreach = surface === 'outreach'

  return (
    <div className="flex h-[calc(100dvh-5rem)] flex-col overflow-hidden bg-transparent dark:bg-background md:h-dvh">
      <header className="flex-shrink-0 border-b border-border/80 bg-card/80 backdrop-blur-md dark:bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Applications
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isOutreach
                ? `${outreachAll.length} message${outreachAll.length === 1 ? '' : 's'} across jobs`
                : `${items.length} job${items.length === 1 ? '' : 's'}${statusFilter !== 'all' ? ' · filtered' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isOutreach ? (
              <div
                className="inline-flex rounded-lg border border-border bg-[#f6f7f9] dark:bg-secondary/40 p-0.5"
                role="group"
                aria-label="View mode"
              >
                <button
                  type="button"
                  onClick={() => changeView('list')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    view === 'list'
                      ? 'bg-white dark:bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => changeView('board')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    view === 'board'
                      ? 'bg-white dark:bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Board
                </button>
              </div>
            ) : null}
            <Button asChild size="sm" className="h-8 gap-1.5">
              <Link href="/dashboard/jobs">
                <Plus className="w-3.5 h-3.5" />
                Add job
              </Link>
            </Button>
          </div>
        </div>

        <div
          className="flex items-center gap-1 px-4 pb-2"
          role="tablist"
          aria-label="Applications surface"
        >
          <SurfaceTab
            active={!isOutreach}
            onClick={() => changeSurface('applications')}
            icon={<Briefcase className="w-3.5 h-3.5" />}
            label="All applications"
          />
          <SurfaceTab
            active={isOutreach}
            onClick={() => changeSurface('outreach')}
            icon={<Mail className="w-3.5 h-3.5" />}
            label="All outreach"
            count={outreachAll.length}
          />
        </div>

        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={
                isOutreach ? 'Search subject, company, message…' : 'Search title, company…'
              }
              className="w-full h-9 rounded-lg border border-border bg-[#f6f7f9] dark:bg-secondary/30 pl-8 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30"
            />
            {query && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
            {isOutreach ? visibleOutreach.length : visibleJobs.length} shown
          </span>
        </div>

        {isOutreach ? (
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 scrollbar-none">
            {(
              [
                ['all', 'All'],
                ['sent', 'Sent'],
                ['received', 'Received'],
                ['note', 'Notes'],
              ] as const
            ).map(([value, label]) => (
              <FilterChip
                key={value}
                label={label}
                count={
                  value === 'all'
                    ? outreachAll.length
                    : outreachAll.filter(r => r.direction === value).length
                }
                active={directionFilter === value}
                onClick={() =>
                  setDirectionFilter(directionFilter === value && value !== 'all' ? 'all' : value)
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 scrollbar-none">
            <FilterChip
              label="All"
              count={items.length}
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            {APPLICATION_STATUSES.map(s => (
              <FilterChip
                key={s.value}
                label={s.label}
                count={statusCounts[s.value] ?? 0}
                active={statusFilter === s.value}
                onClick={() => setStatusFilter(statusFilter === s.value ? 'all' : s.value)}
              />
            ))}
          </div>
        )}
      </header>

      {error && (
        <div
          className="flex-shrink-0 mx-4 mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center justify-between gap-2"
          role="alert"
        >
          <span>{error}</span>
          <button type="button" className="text-xs underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div
        className={cn(
          'flex-1 min-h-0',
          !isOutreach && view === 'board' ? 'overflow-hidden flex flex-col' : 'overflow-auto'
        )}
      >
        {isOutreach ? (
          <OutreachList items={visibleOutreach} />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : visibleJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-sm text-muted-foreground">No jobs match this filter.</p>
            <button
              type="button"
              className="mt-2 text-sm font-medium text-foreground underline-offset-2 hover:underline"
              onClick={() => {
                setQuery('')
                setStatusFilter('all')
              }}
            >
              Clear filters
            </button>
          </div>
        ) : view === 'board' ? (
          <div className="flex-1 min-h-0 p-3 sm:p-4">
            <TrackerBoard
              items={visibleJobs}
              selectedJobId={null}
              savingId={savingId}
              onSelect={openJob}
              onStatusChange={handleStatusChange}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-card min-h-full">
            <TrackerList items={visibleJobs} selectedJobId={null} onSelect={openJob} />
          </div>
        )}
      </div>
    </div>
  )
}

function SurfaceTab({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      {label}
      {typeof count === 'number' ? (
        <span className="tabular-nums text-xs text-muted-foreground">({count})</span>
      ) : null}
      {active ? (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal-500" />
      ) : null}
    </button>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-white dark:bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30'
      )}
    >
      {label}
      <span
        className={cn(
          'tabular-nums rounded-full px-1.5 py-px text-[10px]',
          active ? 'bg-background/20 text-background' : 'bg-secondary text-muted-foreground'
        )}
      >
        {count}
      </span>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl border border-border bg-white dark:bg-card flex items-center justify-center mb-4">
        <Briefcase className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="font-semibold text-foreground">No applications yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Add a job posting to start tracking. Drag cards on the board to update status — it saves
        instantly.
      </p>
      <Button asChild className="mt-5" size="sm">
        <Link href="/dashboard/jobs">Add job</Link>
      </Button>
    </div>
  )
}
