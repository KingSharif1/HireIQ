'use client'

import Link from 'next/link'
import { ArrowRight, Briefcase, FileText, PenLine, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ResumeRow } from '@/lib/profile/resume-row'

export type LibraryTailoredRow = {
  id: string
  job_id: string
  tailored_score: number | null
  match_score: number | null
  created_at: string
  job_title: string | null
  company: string | null
}

interface ResumeLibraryProps {
  resumes: ResumeRow[]
  tailored: LibraryTailoredRow[]
}

/**
 * Resume Builder home — import uploads, edit master profile, open per-job versions.
 */
export function ResumeLibrary({ resumes, tailored }: ResumeLibraryProps) {
  const hasUploads = resumes.length > 0
  const primaryResume = resumes.find(r => r.is_primary) ?? resumes[0]

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Documents
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Resume Builder</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          One place to import files, maintain your master profile, and jump to tailored versions for
          each application.
        </p>
      </header>

      <div className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-secondary/30 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-brand-green/25 bg-brand-green/10 text-brand-green">
                <PenLine className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Master profile</h2>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {hasUploads
                    ? primaryResume
                      ? `Primary source: ${primaryResume.title}`
                      : 'Your uploaded resumes feed the master profile used for tailoring.'
                    : 'Import a resume to seed your master profile, then refine sections on Profile.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/dashboard/builder?view=master">
                  Edit master
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/resume/upload">
                  <Upload className="size-3.5" />
                  Import
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-2">
          <LibraryStat label="Uploaded resumes" value={String(resumes.length)} />
          <LibraryStat label="Job versions" value={String(tailored.length)} />
        </div>
      </div>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Your resumes
          </h2>
        </div>

        {resumes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <FileText className="mx-auto mb-3 size-8 text-muted-foreground/60" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">
              No resumes yet. Import one to seed your master profile.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/dashboard/resume/upload">Import resume</Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {resumes.map(resume => (
              <li key={resume.id}>
                <LibraryResumeRow resume={resume} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Past job versions
        </h2>
        {tailored.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Tailored resumes for applications appear here after you tailor from the tracker.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tailored.map(row => (
              <li key={row.id}>
                <Link
                  href={`/dashboard/tracker/${row.job_id}?tab=documents`}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3',
                    'no-underline transition-colors hover:border-foreground/25 hover:bg-secondary/20',
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                    <Briefcase className="size-4 text-foreground/80" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {row.job_title || 'Untitled role'}
                      {row.company ? (
                        <span className="font-normal text-muted-foreground"> · {row.company}</span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Open documents tab
                      {row.tailored_score != null || row.match_score != null ? (
                        <span>
                          {' '}
                          · Match{' '}
                          {row.tailored_score ?? row.match_score}%
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
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
