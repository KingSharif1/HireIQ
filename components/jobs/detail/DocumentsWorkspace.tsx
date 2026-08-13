'use client'

import { useState } from 'react'
import { Download, Eye, FileSignature, FileText, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CoverLetterPanel } from '@/components/builder/CoverLetterPanel'
import { JobResumeEditor } from '@/components/jobs/detail/JobResumeEditor'
import { ResumePreview } from '@/components/resume/ResumePreview'
import { DocumentExportActions, LayoutIssuesBanner } from '@/components/jobs/detail/LayoutIssuesBanner'
import { DEFAULT_RESUME_THEME } from '@/lib/export/theme'
import { cn, scoreColor } from '@/lib/utils'
import type { ProfileData, StructuredResume, TailorGapAnswer } from '@/types'

export type JobDetailTailoredVersion = {
  id: string
  version: number
  tailored_score: number | null
  match_score: number | null
  cover_letter: string | null
  gap_answers: TailorGapAnswer[] | null
  structured_data: StructuredResume | null
  created_at: string
}

export type DocumentMode = 'list' | 'preview' | 'edit' | 'cover'

type DocumentsWorkspaceProps = {
  jobId: string
  profileData: ProfileData
  onProfileData: (patch: Partial<ProfileData>) => void
  versions: JobDetailTailoredVersion[]
  selectedId: string | null
  onSelectedId: (id: string) => void
  mode: DocumentMode
  onMode: (mode: DocumentMode) => void
  onVersionSaved: (result: {
    tailoredId: string
    structuredData: StructuredResume
    score: number | null
  }) => void
}

export function DocumentsWorkspace({
  jobId,
  profileData,
  onProfileData,
  versions,
  selectedId,
  onSelectedId,
  mode,
  onMode,
  onVersionSaved,
}: DocumentsWorkspaceProps) {
  const selected = versions.find(version => version.id === selectedId) ?? versions[0] ?? null
  const score = selected ? selected.tailored_score ?? selected.match_score : null

  async function downloadDocument(kind: 'resume' | 'cover', tailoredId: string) {
    const response = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tailoredResumeId: tailoredId,
        type: kind === 'cover' ? 'cover' : 'resume',
      }),
    })
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = kind === 'cover' ? 'cover-letter.pdf' : 'tailored-resume.pdf'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  if (mode === 'edit') {
    return (
      <JobResumeEditor
        jobId={jobId}
        data={profileData}
        onUpdate={onProfileData}
        onDone={() => onMode('list')}
        onSaved={result =>
          onVersionSaved({
            tailoredId: result.tailoredId,
            structuredData: result.structuredData,
            score: result.score,
          })
        }
      />
    )
  }

  if (mode === 'cover') {
    return (
      <section className="space-y-4">
        <DocumentBackButton onClick={() => onMode('list')} />
        <div className="rounded-xl border border-border bg-card p-5">
          <CoverLetterPanel
            jobId={jobId}
            tailoredResumeId={selected?.id ?? null}
            initialLetter={selected?.cover_letter ?? ''}
          />
          {selected?.cover_letter ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => void downloadDocument('cover', selected.id)}
            >
              <Download className="h-4 w-4" />
              Download cover letter
            </Button>
          ) : null}
        </div>
      </section>
    )
  }

  if (mode === 'preview' && selected?.structured_data) {
    return (
      <DocumentsPreview
        selected={{ ...selected, structured_data: selected.structured_data }}
        score={score}
        onBack={() => onMode('list')}
        onEdit={() => onMode('edit')}
      />
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Job-specific resume and cover letter documents for this application.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => onMode('edit')}>
          <Plus className="h-4 w-4" />
          {versions.length ? 'Edit resume' : 'Create resume'}
        </Button>
      </div>

      {versions.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-foreground">No tailored resume yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build one from your profile and see every change live.
          </p>
          <Button type="button" size="sm" className="mt-4" onClick={() => onMode('edit')}>
            Create resume
          </Button>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {versions.map(version => {
            const score = version.tailored_score ?? version.match_score
            return (
              <li
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3 hover:bg-secondary/30"
              >
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-3 text-left"
                  onClick={() => {
                    onSelectedId(version.id)
                    onMode('preview')
                  }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                    <FileText className="h-4 w-4 text-foreground" />
                  </span>
                  <span className="min-w-0">
                    <span className="text-sm font-medium text-foreground">
                      Resume v{version.version}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {new Date(version.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  {score != null ? (
                    <span className={cn('text-sm font-semibold tabular-nums', scoreColor(score))}>
                      {score}%
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onSelectedId(version.id)
                      onMode('preview')
                    }}
                  >
                    View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onSelectedId(version.id)
                      onMode('edit')
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void downloadDocument('resume', version.id)}
                  >
                    Download
                  </Button>
                </div>
              </li>
            )
          })}
          <li className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3 hover:bg-secondary/30">
            <button
              type="button"
              className="flex min-w-0 items-center gap-3 text-left"
              onClick={() => onMode('cover')}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                <FileSignature className="h-4 w-4 text-foreground" />
              </span>
              <span className="min-w-0">
                <span className="text-sm font-medium text-foreground">Cover letter</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {selected?.cover_letter ? 'Generated for this job' : 'Optional document for this job'}
                </span>
              </span>
            </button>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => onMode('cover')}>
                <Eye className="h-3.5 w-3.5" />
                Open
              </Button>
              {selected?.cover_letter ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void downloadDocument('cover', selected.id)}
                >
                  Download
                </Button>
              ) : null}
            </div>
          </li>
        </ul>
      )}
    </section>
  )
}

function DocumentBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="text-xs font-medium text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      All documents
    </button>
  )
}

function DocumentsPreview({
  selected,
  score,
  onBack,
  onEdit,
}: {
  selected: JobDetailTailoredVersion & { structured_data: StructuredResume }
  score: number | null | undefined
  onBack: () => void
  onEdit: () => void
}) {
  const [pageCount, setPageCount] = useState(1)

  return (
    <section className="space-y-4">
      <DocumentBackButton onClick={onBack} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-h-[calc(100vh-260px)] space-y-3 rounded-xl border border-border bg-neutral-200 p-3 dark:bg-neutral-900">
          <LayoutIssuesBanner
            resume={selected.structured_data}
            pageCount={pageCount}
            fonts={{
              bodyFontSize: DEFAULT_RESUME_THEME.bodyFontSize,
              nameFontSize: DEFAULT_RESUME_THEME.nameFontSize,
              lineHeight: DEFAULT_RESUME_THEME.lineHeight,
            }}
          />
          <ResumePreview
            data={selected.structured_data}
            theme={DEFAULT_RESUME_THEME}
            showHealth={false}
            showTools={false}
            enablePan
            className="h-full"
            onPageCount={setPageCount}
          />
        </div>
        <aside className="space-y-3 rounded-xl border border-border bg-card p-4 xl:sticky xl:top-36 xl:self-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tailored resume
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Resume v{selected.version}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(selected.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          {score != null ? (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className={cn('text-3xl font-bold tabular-nums', scoreColor(score))}>{score}%</p>
              <p className="text-xs text-muted-foreground">Match score</p>
            </div>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            This version is saved for this application only. Master changes require an explicit promote.
          </p>
          <div className="flex flex-col gap-2">
            <Button type="button" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <DocumentExportActions
              tailoredResumeId={selected.id}
              fileStem={`resume-v${selected.version}`}
              resume={selected.structured_data}
            />
          </div>
        </aside>
      </div>
    </section>
  )
}
