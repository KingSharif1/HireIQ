'use client'

import Link from 'next/link'
import { FileText, Upload, User, Briefcase, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
 * Teal-style Resume Builder landing — library of uploads + past job versions.
 * Same `resumes` set as Profile Documents (two doors). Master edits → Profile.
 */
export function ResumeLibrary({ resumes, tailored }: ResumeLibraryProps) {
  return (
    <div className="mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Resume Builder</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import resumes, open past job versions, or edit your master on Profile.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-8">
        <Button asChild>
          <Link href="/dashboard/resume/upload">
            <Upload className="w-4 h-4" />
            Import resume
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/profile">
            <User className="w-4 h-4" />
            Edit master profile
          </Link>
        </Button>
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your resumes
          </h2>
          <Link
            href="/dashboard/profile?section=resumes"
            className="text-xs text-muted-foreground hover:text-foreground no-underline"
          >
            Also in Profile → Documents
          </Link>
        </div>

        {resumes.length === 0 ? (
          <div
            className={cn(
              'rounded-md border border-dashed border-border px-4 py-10 text-center'
            )}
          >
            <FileText className="w-8 h-8 mx-auto text-muted-foreground/60 mb-3" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground mb-4">
              No resumes yet. Import one to seed your master profile.
            </p>
            <Button asChild size="sm">
              <Link href="/dashboard/resume/upload">
                <Plus className="w-4 h-4" />
                Import resume
              </Link>
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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Past job versions
        </h2>
        {tailored.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tailored resumes for applications will show up here. Tailor from an application in the tracker.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tailored.map(row => (
              <li key={row.id}>
                <Link
                  href={`/dashboard/tracker/${row.job_id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-md border border-border bg-white dark:bg-card',
                    'px-4 py-3 transition-colors hover:border-foreground/40 no-underline'
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Briefcase className="h-4 w-4 text-foreground/80" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground truncate">
                      {row.job_title || 'Untitled role'}
                      {row.company ? (
                        <span className="font-normal text-muted-foreground"> · {row.company}</span>
                      ) : null}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {new Date(row.created_at).toLocaleDateString()}
                    </span>
                  </span>
                  {(row.tailored_score ?? row.match_score) != null && (
                    <Badge
                      variant={(row.tailored_score ?? row.match_score)! >= 70 ? 'success' : 'warning'}
                    >
                      {row.tailored_score ?? row.match_score}%
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
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
        <Link href="/dashboard/profile">Open master</Link>
      </Button>
    </div>
  )
}
