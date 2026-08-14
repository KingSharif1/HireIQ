'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Download, FileText, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CoverLetterPanel } from '@/components/builder/CoverLetterPanel'
import { JobResumeEditor } from '@/components/jobs/detail/JobResumeEditor'
import { ResumePreview } from '@/components/resume/ResumePreview'
import { DocumentExportActions, LayoutIssuesBanner } from '@/components/jobs/detail/LayoutIssuesBanner'
import { DEFAULT_RESUME_THEME } from '@/lib/export/theme'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { cn, scoreColor } from '@/lib/utils'
import type { ATSScore, ChangeDecision, JobExtractedData, ProfileData, ResumeDiffChange, StructuredResume, TailorGapAnswer } from '@/types'
import { DocumentCreateChooser } from '@/components/jobs/detail/DocumentCreateChooser'
import { AiTailorFlow } from '@/components/jobs/detail/AiTailorFlow'
import { countPendingDecisions } from '@/lib/tailor/change-decisions'

export type JobDetailTailoredVersion = {
  id: string
  version: number
  tailored_score: number | null
  match_score: number | null
  cover_letter: string | null
  gap_answers: TailorGapAnswer[] | null
  structured_data: StructuredResume | null
  original_structured_data?: StructuredResume | null
  changes?: ResumeDiffChange[] | null
  change_decisions?: Record<string, ChangeDecision> | null
  created_at: string
}

export type DocumentMode = 'list' | 'preview' | 'edit' | 'cover' | 'choose' | 'ai-tailor' | 'ai-review'

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
    version?: number
  }) => void
  jobExtracted?: JobExtractedData | null
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
  jobExtracted = null,
}: DocumentsWorkspaceProps) {
  const selected = versions.find(version => version.id === selectedId) ?? versions[0] ?? null
  const score = selected ? selected.tailored_score ?? selected.match_score : null
  const [chooserKind, setChooserKind] = useState<'resume' | 'cover'>('resume')
  const [coverStartAi, setCoverStartAi] = useState(false)
  const listTab = mode === 'cover' ? 'cover' : 'resume'

  function openCreate(kind: 'resume' | 'cover') {
    setChooserKind(kind)
    onMode('choose')
  }

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [mode])

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

  if (mode === 'choose') {
    return (
      <DocumentCreateChooser
        kind={chooserKind}
        onAi={() => {
          if (chooserKind === 'cover') {
            setCoverStartAi(true)
            onMode('cover')
          } else {
            onMode('ai-tailor')
          }
        }}
        onManual={() => onMode(chooserKind === 'cover' ? 'cover' : 'edit')}
        onClose={() => onMode('list')}
      />
    )
  }

  if (mode === 'ai-tailor' || mode === 'ai-review') {
    const reviewVersion =
      mode === 'ai-review' && selected?.original_structured_data && selected.structured_data
        ? {
            tailoredId: selected.id,
            original: selected.original_structured_data,
            tailored: selected.structured_data,
            changes: selected.changes ?? [],
            decisions: selected.change_decisions ?? {},
            matchScore: selected.match_score,
            tailoredScore: selected.tailored_score,
          }
        : undefined

    return (
      <AiTailorFlow
        jobId={jobId}
        jobExtracted={jobExtracted}
        reviewOnly={reviewVersion}
        onDone={() => onMode('list')}
        onComplete={result =>
          onVersionSaved({
            tailoredId: result.tailoredId,
            structuredData: result.structuredData,
            score: result.score,
            version: result.version,
          })
        }
      />
    )
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

  if (mode === 'preview' && selected?.structured_data) {
    return (
      <DocumentsPreview
        selected={{ ...selected, structured_data: selected.structured_data }}
        score={score}
        jobExtracted={jobExtracted}
        onBack={() => onMode('list')}
        onEdit={() => onMode('edit')}
      />
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {listTab === 'cover'
              ? 'Write or generate a cover letter for this job.'
              : 'Tailored resume versions for this application.'}
          </p>
        </div>
        {listTab === 'resume' ? (
          <Button type="button" size="sm" onClick={() => openCreate('resume')}>
            <Plus className="h-4 w-4" />
            {versions.length ? 'New resume' : 'Create resume'}
          </Button>
        ) : selected?.cover_letter ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void downloadDocument('cover', selected.id)}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => openCreate('cover')}>
            <Plus className="h-4 w-4" />
            New cover letter
          </Button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Document type"
        className="mt-4 flex w-fit gap-1 rounded-lg border border-border bg-secondary/30 p-1"
      >
        {(
          [
            { id: 'resume' as const, label: 'Resume' },
            { id: 'cover' as const, label: 'Cover letter' },
          ]
        ).map(item => {
          const selectedTab = listTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selectedTab}
              onClick={() => onMode(item.id === 'cover' ? 'cover' : 'list')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                selectedTab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {listTab === 'cover' ? (
        <div className="mt-5">
          {versions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm font-medium text-foreground">Create a resume first</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cover letters are saved with a tailored resume for this job.
              </p>
              <Button type="button" size="sm" className="mt-4" onClick={() => openCreate('resume')}>
                Create resume
              </Button>
            </div>
          ) : (
            <CoverLetterPanel
              jobId={jobId}
              tailoredResumeId={selected?.id ?? null}
              initialLetter={selected?.cover_letter ?? ''}
              embedded
              autoGenerate={coverStartAi}
              onAutoGenerateDone={() => setCoverStartAi(false)}
            />
          )}
        </div>
      ) : versions.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-foreground">No tailored resume yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build one from your profile and see every change live.
          </p>
          <Button type="button" size="sm" className="mt-4" onClick={() => openCreate('resume')}>
            Create resume
          </Button>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {versions.map(version => {
            const versionScore = version.tailored_score ?? version.match_score
            const pendingReview =
              (version.changes?.length ?? 0) > 0 &&
              countPendingDecisions(version.changes ?? [], version.change_decisions ?? {}) > 0
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
                <div className="flex flex-wrap items-center gap-2">
                  {pendingReview ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="bg-teal-600 hover:bg-teal-700"
                      onClick={() => {
                        onSelectedId(version.id)
                        onMode('ai-review')
                      }}
                    >
                      Review AI changes
                    </Button>
                  ) : null}
                  {versionScore != null ? (
                    <span className={cn('text-sm font-semibold tabular-nums', scoreColor(versionScore))}>
                      {versionScore}%
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
        </ul>
      )}
    </section>
  )
}

function DocumentsPreview({
  selected,
  score,
  jobExtracted,
  onBack,
  onEdit,
}: {
  selected: JobDetailTailoredVersion & { structured_data: StructuredResume }
  score: number | null | undefined
  jobExtracted: JobExtractedData | null
  onBack: () => void
  onEdit: () => void
}) {
  const [pageCount, setPageCount] = useState(1)
  const analysis = useMemo(
    () => (jobExtracted ? calculateATSScore(selected.structured_data, jobExtracted) : null),
    [jobExtracted, selected.structured_data]
  )
  const displayScore = analysis?.total ?? score ?? null

  return (
    <section className="flex min-h-[calc(100dvh-11rem)] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          All documents
        </button>
        <span className="hidden text-border sm:inline">·</span>
        <p className="min-w-0 truncate text-sm font-semibold text-foreground">
          Resume v{selected.version}
        </p>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {new Date(selected.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {displayScore != null ? (
            <MatchScoreMenu score={displayScore} analysis={analysis} />
          ) : null}
          <Button type="button" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <DocumentExportActions
            tailoredResumeId={selected.id}
            fileStem={`resume-v${selected.version}`}
            resume={selected.structured_data}
            inline
          />
        </div>
      </div>

      <LayoutIssuesBanner
        compact
        resume={selected.structured_data}
        pageCount={pageCount}
        fonts={{
          bodyFontSize: DEFAULT_RESUME_THEME.bodyFontSize,
          nameFontSize: DEFAULT_RESUME_THEME.nameFontSize,
          lineHeight: DEFAULT_RESUME_THEME.lineHeight,
        }}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-neutral-200 dark:bg-neutral-900">
        <ResumePreview
          data={selected.structured_data}
          theme={DEFAULT_RESUME_THEME}
          showHealth={false}
          showTools
          enablePan
          className="h-full min-h-[calc(100dvh-16rem)] p-2 sm:p-3"
          onPageCount={setPageCount}
        />
      </div>
    </section>
  )
}

const BREAKDOWN_LABELS: { key: keyof ATSScore['breakdown']; label: string }[] = [
  { key: 'keywords', label: 'Keywords' },
  { key: 'skills', label: 'Skills' },
  { key: 'experience', label: 'Experience' },
  { key: 'format', label: 'Format' },
  { key: 'education', label: 'Education' },
]

function MatchScoreMenu({
  score,
  analysis,
}: {
  score: number
  analysis: ATSScore | null
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold tabular-nums',
            scoreColor(score)
          )}
        >
          {score}%
          <span className="hidden font-medium text-muted-foreground sm:inline">match</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(calc(100vw-2rem),20rem)] p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Why this score
        </p>
        <p className={cn('mt-1 text-2xl font-bold tabular-nums', scoreColor(score))}>{score}%</p>
        {analysis ? (
          <ul className="mt-3 space-y-2">
            {BREAKDOWN_LABELS.map(item => {
              const value = analysis.breakdown[item.key]
              const weak = value < 60
              return (
                <li key={item.key}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={weak ? 'font-medium text-amber-800 dark:text-amber-300' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
                    <span className={cn('tabular-nums', weak ? 'font-semibold text-amber-800 dark:text-amber-300' : 'text-foreground')}>
                      {value}%
                    </span>
                  </div>
                  <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn('h-full rounded-full', weak ? 'bg-amber-500' : 'bg-foreground/70')}
                      style={{ width: `${Math.max(4, value)}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Score is saved with this version. Open Edit → Analyze for a live breakdown.
          </p>
        )}
        {analysis?.missing_keywords.slice(0, 6).length ? (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
              Add these keywords
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {analysis.missing_keywords.slice(0, 6).map(keyword => (
                <span
                  key={keyword}
                  className="rounded-md border border-amber-500/25 bg-background/70 px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {analysis?.recommendations.length ? (
          <div className="mt-2 rounded-lg border border-sky-500/25 bg-sky-500/10 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-900 dark:text-sky-200">
              How to improve
            </p>
            <ul className="mt-1.5 space-y-1.5 text-xs leading-5 text-foreground">
              {analysis.recommendations.slice(0, 3).map(tip => (
                <li key={tip} className="pl-3 relative before:absolute before:left-0 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-sky-600">
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
