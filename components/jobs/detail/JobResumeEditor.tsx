'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ContentEditor } from '@/components/builder/ContentEditor'
import { DesignerPanel } from '@/components/builder/designer/DesignerPanel'
import { AnalyzerPanel } from '@/components/builder/AnalyzerPanel'
import { JobMatcherPanel } from '@/components/builder/JobMatcherPanel'
import { CoverLetterPanel } from '@/components/builder/CoverLetterPanel'
import { LayoutIssuesBanner } from '@/components/jobs/detail/LayoutIssuesBanner'
import { ResumePreview } from '@/components/resume/ResumePreview'
import { applyInclusion } from '@/lib/profile/inclusion'
import {
  DEFAULT_RESUME_THEME,
  mergeResumeTheme,
  type ResumeTheme,
} from '@/lib/export/theme'
import type { ProfileData, ResumeInclusion, StructuredResume } from '@/types'

type EditorTab = 'content' | 'designer' | 'analyzer' | 'matcher' | 'cover'

const TABS: { id: EditorTab; label: string }[] = [
  { id: 'content', label: 'Content Editor' },
  { id: 'designer', label: 'Designer' },
  { id: 'analyzer', label: 'Analyzer' },
  { id: 'matcher', label: 'Job Matcher' },
  { id: 'cover', label: 'Cover Letter' },
]

type JobResumeEditorProps = {
  jobId: string
  data: ProfileData
  onUpdate: (patch: Partial<ProfileData>) => void
  onDone: () => void
  onSaved: (result: {
    tailoredId: string
    structuredData: StructuredResume
    score: number | null
  }) => void
}

/**
 * Full-bleed Teal workspace for a single job's tailored resume.
 * Master profile is never written from this surface (inclusion stays on tailored_resumes).
 */
export function JobResumeEditor({
  jobId,
  data,
  onUpdate,
  onDone,
  onSaved,
}: JobResumeEditorProps) {
  const [tab, setTab] = useState<EditorTab>('matcher')
  const [inclusion, setInclusion] = useState<ResumeInclusion>({})
  const [theme, setTheme] = useState<ResumeTheme>(() => mergeResumeTheme(DEFAULT_RESUME_THEME, null))
  const [pageCount, setPageCount] = useState(1)

  const previewData = useMemo(() => applyInclusion(data, inclusion), [data, inclusion])

  const showSidePreview = tab === 'content' || tab === 'designer' || tab === 'analyzer'

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-background pb-20 md:pb-0 md:left-[60px]">
      <header className="flex-shrink-0 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 md:px-4 py-2.5">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">
              Resume for this application
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Changes stay with this job. Your master profile is unchanged.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onDone}>
            Done editing
          </Button>
        </div>
        <div
          role="tablist"
          className="flex items-center gap-1 px-2 md:px-4 overflow-x-auto border-t border-border"
        >
          {TABS.map(item => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'relative px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                tab === item.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
              {tab === item.id ? (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-foreground" />
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {tab === 'matcher' ? (
          <div className="flex-1 min-h-0 min-w-0">
            <JobMatcherPanel
              data={data}
              onUpdate={onUpdate}
              initialJobId={jobId}
              lockJobSelection
              fullBleed
              onInclusionPreview={setInclusion}
              onSaved={result =>
                onSaved({
                  tailoredId: result.tailoredId,
                  structuredData: result.structuredData,
                  score: result.score,
                })
              }
            />
          </div>
        ) : null}

        {tab === 'cover' ? (
          <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6">
            <CoverLetterPanel jobId={jobId} />
          </div>
        ) : null}

        {showSidePreview ? (
          <>
            <div className="flex-1 min-w-0 min-h-0 overflow-auto border-r border-border p-4 md:p-6 lg:max-w-[46%]">
              {tab === 'content' ? (
                <ContentEditor
                  data={data}
                  inclusion={inclusion}
                  onInclusionChange={setInclusion}
                  onUpdate={onUpdate}
                />
              ) : null}
              {tab === 'designer' ? (
                <DesignerPanel
                  theme={theme}
                  onChange={patch => setTheme(prev => mergeResumeTheme(prev, patch))}
                  onReset={() => setTheme({ ...DEFAULT_RESUME_THEME })}
                />
              ) : null}
              {tab === 'analyzer' ? <AnalyzerPanel data={data} /> : null}
            </div>
            <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-neutral-100/80 dark:bg-secondary/20">
              <div className="flex-1 min-h-0 space-y-3 overflow-auto p-3 md:p-4">
                <LayoutIssuesBanner
                  resume={previewData}
                  pageCount={pageCount}
                  fonts={{
                    bodyFontSize: theme.bodyFontSize,
                    nameFontSize: theme.nameFontSize,
                    lineHeight: theme.lineHeight,
                  }}
                />
                <ResumePreview
                  data={previewData}
                  theme={theme}
                  showHealth={false}
                  showTools
                  enablePan
                  className="h-full min-h-[480px]"
                  onPageCount={setPageCount}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
