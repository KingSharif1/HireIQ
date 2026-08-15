'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, Download, FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ResumeRow } from '@/lib/profile/resume-row'
import {
  groupTailoredByJob,
  type TailoredLibraryRow,
} from '@/lib/builder/group-tailored'

export type LibraryTailoredRow = TailoredLibraryRow

interface ResumeLibraryProps {
  resumes: ResumeRow[]
  tailored: LibraryTailoredRow[]
}

/**
 * Files & versions — uploads plus tailored resumes grouped by job.
 */
export function ResumeLibrary({ resumes, tailored }: ResumeLibraryProps) {
  const hasUploads = resumes.length > 0
  const primaryResume = resumes.find(r => r.is_primary) ?? resumes[0]
  const groups = groupTailoredByJob(tailored)
  const jobCount = groups.length

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-secondary/30 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Source files</h2>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {hasUploads
                  ? primaryResume
                    ? `Primary source: ${primaryResume.title}`
                    : 'Uploaded resumes seed the master profile used for tailoring.'
                  : 'Import a resume to seed your master profile.'}
              </p>
            </div>
            <Button asChild size="sm" variant={hasUploads ? 'outline' : 'default'}>
              <Link href="/dashboard/resume/upload">
                <Upload className="size-3.5" />
                {hasUploads ? 'Replace resume' : 'Import resume'}
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-2">
          <LibraryStat label="Source resume" value={hasUploads ? '1' : '0'} />
          <LibraryStat label="Jobs with versions" value={String(jobCount)} />
        </div>
      </div>

      {primaryResume ? (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Uploaded source file
          </h2>
          <LibraryResumeRow resume={primaryResume} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Tailored resumes by job
        </h2>
        {groups.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Tailored resumes for applications appear here after you tailor from the tracker.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {groups.map(group => (
              <li key={group.folderKey}>
                <JobVersionGroup group={group} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function JobVersionGroup({ group }: { group: ReturnType<typeof groupTailoredByJob>[number] }) {
  const [open, setOpen] = useState(false)
  const score = group.latest.tailored_score ?? group.latest.match_score
  const versionCount = group.versions.length

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground/80"
          aria-expanded={open}
          aria-label={open ? 'Collapse versions' : 'Open versions'}
        >
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </button>
        <span className="min-w-0 flex-1">
          <Link
            href={`/dashboard/tracker/${group.jobId}`}
            className="block truncate text-sm font-medium text-foreground no-underline hover:underline"
          >
            {group.jobTitle}
            {group.company ? (
              <span className="font-normal text-muted-foreground"> · {group.company}</span>
            ) : null}
          </Link>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {versionCount} {versionCount === 1 ? 'version' : 'versions'}
          </span>
        </span>
        {score != null ? (
          <Badge variant={score >= 70 ? 'success' : 'warning'} className="w-fit">
            {score}%
          </Badge>
        ) : null}
      </div>
      {open ? (
        <ul className="border-t border-border bg-secondary/25">
          {group.versions.map(row => (
            <li
              key={row.id}
              className="flex flex-col gap-2 border-b border-border/60 px-4 py-2.5 last:border-b-0 sm:flex-row sm:items-center"
            >
              <span className="min-w-0 flex-1 text-sm text-foreground">
                Resume v{row.version ?? '—'}
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleDateString()}
                </span>
              </span>
              {(row.tailored_score ?? row.match_score) != null ? (
                <Badge
                  variant={(row.tailored_score ?? row.match_score)! >= 70 ? 'success' : 'warning'}
                  className="w-fit"
                >
                  {row.tailored_score ?? row.match_score}%
                </Badge>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/tracker/${row.job_id}?tab=documents&docId=${row.id}&docMode=preview`}>
                    View
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/tracker/${row.job_id}?tab=documents&docId=${row.id}&docMode=edit`}>
                    Edit
                  </Link>
                </Button>
                <TailoredDownloadButton tailoredId={row.id} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function LibraryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-5 py-4 sm:px-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function LibraryResumeRow({ resume }: { resume: ResumeRow }) {
  return (
    <Link
      href={`/dashboard/resume/${resume.id}`}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3',
        'no-underline transition-colors hover:border-foreground/25 hover:bg-secondary/20',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
        <FileText className="size-4 text-foreground/80" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{resume.title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {resume.is_primary ? 'Primary · ' : ''}
          {resume.ats_format_score != null ? `ATS ${resume.ats_format_score}% · ` : ''}
          Added {new Date(resume.created_at).toLocaleDateString()}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

function TailoredDownloadButton({ tailoredId }: { tailoredId: string }) {
  async function download() {
    const response = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tailoredResumeId: tailoredId }),
    })
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'tailored-resume.pdf'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={() => void download()}>
      <Download className="h-3.5 w-3.5" />
      Download
    </Button>
  )
}

