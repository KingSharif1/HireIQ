'use client'

import Link from 'next/link'
import { Briefcase, Download, ExternalLink, Eye, FileText, Pencil, Upload, User } from 'lucide-react'
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
  hasMasterProfile: boolean
  masterName: string
  masterTitle: string
}

/**
 * Teal-style Resume Builder landing — library of uploads + past job versions.
 * Same `resumes` set as Profile Documents (two doors). Master edits → Profile.
 */
export function ResumeLibrary({
  resumes,
  tailored,
  hasMasterProfile,
  masterName,
  masterTitle,
}: ResumeLibraryProps) {
  const hasSource = hasMasterProfile || resumes.length > 0

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Resume Builder</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build and manage tailored resumes for each application. Profile remains your master source.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <User className="h-4 w-4 text-foreground" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Master source
              </p>
              <h2 className="mt-1 truncate text-base font-semibold text-foreground">
                {hasSource ? masterName : 'No master resume yet'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasSource
                  ? `${masterTitle}. Profile is the source of truth; tailored resumes stay job-specific.`
                  : 'Import a resume to seed your Profile before tailoring for jobs.'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant={hasSource ? 'outline' : 'default'}>
              <Link href="/dashboard/resume/upload">
                <Upload className="h-4 w-4" />
                Import resume
              </Link>
            </Button>
            {hasSource ? (
              <Button asChild variant="ghost">
                <Link href="/dashboard/profile">View master</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {resumes.length > 0 ? (
        <section className="mb-10">
          <details className="group overflow-hidden rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary/40 [&::-webkit-details-marker]:hidden">
              Uploaded source files
              <span className="text-xs font-normal text-muted-foreground">
                {resumes.length} file{resumes.length === 1 ? '' : 's'}
              </span>
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {resumes.map(resume => (
                <li key={resume.id}>
                  <LibraryResumeRow resume={resume} />
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Tailored resumes by job
        </h2>
        {tailored.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tailored resumes for applications will show up here. Tailor from an application in the tracker.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tailored.map(row => (
              <li key={row.id}>
                <div
                  className={cn(
                    'flex flex-col gap-3 rounded-md border border-border bg-white px-4 py-3 dark:bg-card',
                    'transition-colors hover:border-foreground/40 sm:flex-row sm:items-center'
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Briefcase className="h-4 w-4 text-foreground/80" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <a
                      href={safeHttpUrl(row.apply_url) ?? `/dashboard/tracker/${row.job_id}`}
                      target={safeHttpUrl(row.apply_url) ? '_blank' : undefined}
                      rel={safeHttpUrl(row.apply_url) ? 'noreferrer' : undefined}
                      className="block truncate text-sm font-medium text-foreground no-underline hover:underline"
                    >
                      {row.job_title || 'Untitled role'}
                      {row.company ? (
                        <span className="font-normal text-muted-foreground"> · {row.company}</span>
                      ) : null}
                      {safeHttpUrl(row.apply_url) ? (
                        <ExternalLink className="ml-1 inline h-3 w-3 align-[-1px]" />
                      ) : null}
                    </a>
                    <span className="block text-xs text-muted-foreground mt-0.5">
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
            ))}
          </ul>
        )}
      </section>
    </div>
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

function LibraryResumeRow({ resume }: { resume: ResumeRow }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border border-border bg-white dark:bg-card',
        'px-4 py-3 transition-colors hover:border-foreground/40'
      )}
    >
      <Link
        href={`/dashboard/resume/${resume.id}`}
        className="flex items-center gap-3 flex-1 min-w-0 no-underline"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-purple/10">
          <FileText className="h-4 w-4 text-brand-purple" strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{resume.title}</span>
            {resume.is_primary && (
              <Badge variant="default" className="text-[10px]">
                Primary
              </Badge>
            )}
          </span>
          {resume.ats_format_score != null && (
            <span className="block text-xs text-muted-foreground mt-0.5">
              Format score: {resume.ats_format_score}%
            </span>
          )}
        </span>
      </Link>
      <Button asChild size="sm" variant="outline" className="flex-shrink-0">
        <Link href={`/dashboard/resume/${resume.id}`}>View</Link>
      </Button>
    </div>
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
