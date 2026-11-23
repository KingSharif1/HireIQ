'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Download, FileText, Mail, RefreshCw, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, scoreColor } from '@/lib/utils'
import { buildJobTimeline, type ActivityItem } from '@/lib/applications/activity'
import { nextStepFor } from '@/lib/applications/pulse'
import { downloadTailoredPdf } from '@/lib/api/client'
import { userFacingTailorError } from '@/lib/tailor/user-error'
import type { TailorRunStatus } from '@/lib/tailor/run-types'
import type { ApplicationStatus } from '@/types'

type Version = {
  id: string
  version: number
  created_at: string
  tailored_score: number | null
  match_score: number | null
}

const DOT: Record<ActivityItem['kind'], string> = {
  status: 'bg-brand-green',
  email: 'bg-primary',
  resume: 'bg-primary',
  created: 'bg-muted-foreground',
  note: 'bg-amber-500',
  other: 'bg-muted-foreground',
}

const VISIBLE = 8

function when(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Per-job overview: the next step, the resume used for this job, and one
 * timeline of status changes, emails, notes and resume versions.
 */
export function JobTimeline({
  status,
  appliedAt,
  followUpAt,
  activity,
  versions,
  notes,
  tailorRunStatus,
  tailorRunError,
  onViewResume,
  onReviewResume,
  onTailor,
  onOpenActivity,
}: {
  status: ApplicationStatus
  appliedAt: string | null
  followUpAt: string | null
  activity: readonly ActivityItem[]
  versions: readonly Version[]
  notes: string
  tailorRunStatus: TailorRunStatus | null
  tailorRunError: string | null
  onViewResume: (id: string) => void
  /** Open the accept/decline review for a version (used when export is blocked on review). */
  onReviewResume?: (id: string) => void
  onTailor: () => void
  onOpenActivity: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const timeline = useMemo(() => buildJobTimeline(activity, versions), [activity, versions])
  const latest = versions[0] ?? null
  const latestScore = latest ? latest.tailored_score ?? latest.match_score : null
  const hasReply = activity.some((item) => item.kind === 'email')
  const nextStep = nextStepFor({
    status,
    appliedAt,
    followUpAt,
    hasReply,
    hasResume: Boolean(latest),
    tailorFailed: tailorRunStatus === 'failed',
  })
  const failure = tailorRunStatus === 'failed' ? userFacingTailorError(tailorRunError) : null

  async function download(id: string) {
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadTailoredPdf(id, 'resume')
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not export the PDF')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section aria-label="Job timeline" className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
        <p className="text-sm">
          <span className="text-muted-foreground">Next step: </span>
          <span className="font-medium text-foreground">{nextStep}</span>
        </p>
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Resume for this job</p>
        {failure ? (
          <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-destructive">{failure.title}</p>
              <p className="text-xs text-muted-foreground">{failure.message}</p>
            </div>
            <Button size="sm" onClick={onTailor}>
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </Button>
          </div>
        ) : null}
        {latest ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="truncate text-sm text-foreground">
                Tailored resume v{latest.version}
                <span className="text-muted-foreground"> · {when(latest.created_at)}</span>
                {latestScore != null ? (
                  <span className={cn('ml-2 font-semibold tabular-nums', scoreColor(latestScore))}>{latestScore}%</span>
                ) : null}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onViewResume(latest.id)}>
                View
              </Button>
              <Button size="sm" variant="outline" disabled={downloading} onClick={() => void download(latest.id)}>
                <Download className="h-3.5 w-3.5" /> {downloading ? 'Exporting…' : 'PDF'}
              </Button>
            </div>
          </div>
        ) : !failure ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">No tailored resume yet for this job.</p>
            <Button size="sm" onClick={onTailor}>
              Tailor resume
            </Button>
          </div>
        ) : null}
        {downloadError ? (
          <div role="alert" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-destructive">
            <span>{downloadError}</span>
            {latest ? (
              <button
                type="button"
                className="font-medium text-foreground underline-offset-2 hover:underline"
                onClick={() => {
                  setDownloadError(null)
                  if (/review/i.test(downloadError) && onReviewResume) onReviewResume(latest.id)
                  else onViewResume(latest.id)
                }}
              >
                {/review/i.test(downloadError) ? 'Review changes' : 'Open resume'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {notes.trim() ? (
        <div className="flex gap-2 border-b border-border px-4 py-3">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
          <p className="line-clamp-3 whitespace-pre-line text-sm text-foreground/90">{notes}</p>
        </div>
      ) : null}

      <div className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Timeline</p>
          <button type="button" onClick={onOpenActivity} className="text-xs font-medium text-primary hover:underline">
            Add note or event
          </button>
        </div>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet. Status changes, emails and resumes will show up here.</p>
        ) : (
          <ol className="relative space-y-3 border-l border-border pl-4">
            {timeline.slice(0, VISIBLE).map((item) => (
              <li key={item.id} className="relative">
                <span className={cn('absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ring-4 ring-card', DOT[item.kind])} aria-hidden />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    {item.kind === 'email' ? <Mail className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
                    {item.title}
                  </p>
                  <time className="text-xs tabular-nums text-muted-foreground" dateTime={item.at}>
                    {when(item.at)}
                  </time>
                </div>
                {item.detail ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.detail}</p> : null}
              </li>
            ))}
          </ol>
        )}
        {timeline.length > VISIBLE ? (
          <button type="button" onClick={onOpenActivity} className="mt-3 text-xs font-medium text-primary hover:underline">
            See all {timeline.length} events
          </button>
        ) : null}
      </div>
    </section>
  )
}
