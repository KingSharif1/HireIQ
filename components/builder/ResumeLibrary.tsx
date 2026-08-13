'use client'

import Link from 'next/link'
import { ArrowRight, Briefcase, Download, ExternalLink, Eye, FileText, Pencil, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ResumeRow } from '@/lib/profile/resume-row'

export type LibraryTailoredRow = {
  id: string
  job_id: string
  version?: number
  tailored_score: number | null
  match_score: number | null
  created_at: string
  job_title: string | null
  company: string | null
  apply_url?: string | null
}

interface ResumeLibraryProps {
  resumes: ResumeRow[]
  tailored: LibraryTailoredRow[]
}

/**
 * Files & versions tab — uploads plus job-first tailored resumes.
 */
export function ResumeLibrary({ resumes, tailored }: ResumeLibraryProps) {
  const hasUploads = resumes.length > 0
  const primaryResume = resumes.find(r => r.is_primary) ?? resumes[0]

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Documents
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Files & versions</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Import source files and manage tailored resumes for each application. Master content lives
          on the Master resume tab.
        </p>
      </header>

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
                Import resume
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-2">
          <LibraryStat label="Uploaded resumes" value={String(resumes.length)} />
          <LibraryStat label="Job versions" value={String(tailored.length)} />
        </div>
      </div>

      {resumes.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Uploaded source files
          </h2>
          <ul className="flex flex-col gap-2">
            {resumes.map(resume => (
              <li key={resume.id}>
                <LibraryResumeRow resume={resume} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Tailored resumes by job
        </h2>
        {tailored.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Tailored resumes for applications appear here after you tailor from the tracker.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tailored.map(row => {
              const postingUrl = safeHttpUrl(row.apply_url)
              return (
                <li key={row.id}>
                  <div
                    className={cn(
                      'flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3',
                      'transition-colors hover:border-foreground/25 sm:flex-row sm:items-center'
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                      <Briefcase className="size-4 text-foreground/80" strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <a
                        href={postingUrl ?? `/dashboard/tracker/${row.job_id}`}
                        target={postingUrl ? '_blank' : undefined}
                        rel={postingUrl ? 'noreferrer' : undefined}
                        className="block truncate text-sm font-medium text-foreground no-underline hover:underline"
                      >
                        {row.job_title || 'Untitled role'}
                        {row.company ? (
                          <span className="font-normal text-muted-foreground"> · {row.company}</span>
                        ) : null}
                        {postingUrl ? (
                          <ExternalLink className="ml-1 inline h-3 w-3 align-[-1px]" />
                        ) : null}
                      </a>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {row.version ? `Resume v${row.version} · ` : ''}
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
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/tracker/${row.job_id}?tab=documents&docId=${row.id}&docMode=preview`}>
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/tracker/${row.job_id}?tab=documents&docId=${row.id}&docMode=edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                      <TailoredDownloadButton tailoredId={row.id} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
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

function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}
