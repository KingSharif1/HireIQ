'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JobResumeEditor } from '@/components/jobs/detail/JobResumeEditor'
import { ResumePreview } from '@/components/resume/ResumePreview'
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

export type DocumentMode = 'list' | 'preview' | 'edit'

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
    const score = selected.tailored_score ?? selected.match_score
    return (
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => onMode('list')}
            >
              ← All documents
            </button>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Resume v{selected.version}
              {score != null ? (
                <span className={cn('ml-2 text-sm tabular-nums', scoreColor(score))}>
                  {score}% match
                </span>
              ) : null}
            </h2>
          </div>
          <Button type="button" size="sm" onClick={() => onMode('edit')}>
            Edit resume
          </Button>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <ResumePreview
            data={selected.structured_data}
            theme={DEFAULT_RESUME_THEME}
            showHealth={false}
            showTools
            enablePan
          />
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumes prepared specifically for this application.
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
                  className="min-w-0 text-left"
                  onClick={() => {
                    onSelectedId(version.id)
                    onMode('preview')
                  }}
                >
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
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
