'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, Loader2, AlertCircle, ChevronLeft, Download } from 'lucide-react'
import { SECTIONS, SECTION_GROUPS, type SectionId } from '@/lib/profile/sections'
import type { Profile, ProfileData, ResumeInclusion } from '@/types'
import type { GitHubProfileData } from '@/lib/github/types'
import { applyInclusion } from '@/lib/profile/inclusion'
import { ResumePreview } from '@/components/resume/ResumePreview'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { ContentEditor } from '@/components/builder/ContentEditor'
import { DesignerPanel } from '@/components/builder/designer/DesignerPanel'
import { AnalyzerPanel } from '@/components/builder/AnalyzerPanel'
import { JobMatcherPanel } from '@/components/builder/JobMatcherPanel'
import { CoverLetterPanel } from '@/components/builder/CoverLetterPanel'
import {
  DEFAULT_RESUME_THEME,
  mergeResumeTheme,
  type ResumeTheme,
} from '@/lib/export/theme'
import { useProfileSave } from '@/components/profile/useProfileSave'
import { ProfileSectionNav } from '@/components/profile/ProfileSectionNav'
import { ProfileSectionPanel, type ResumeRow } from '@/components/profile/ProfileSectionPanel'

interface Props {
  userId: string
  initialData: ProfileData
  profile: Profile | null
  resumes: ResumeRow[]
  githubData: GitHubProfileData | null
}

type WorkspaceTab = 'content' | 'designer' | 'analyzer' | 'matcher' | 'cover'

const TAB_FROM_PARAM: Record<string, WorkspaceTab> = {
  content: 'content',
  designer: 'designer',
  analyzer: 'analyzer',
  matcher: 'matcher',
  'job-matcher': 'matcher',
  cover: 'cover',
  'cover-letter': 'cover',
}

export function ProfileWorkspace({ userId, initialData, profile, resumes, githubData }: Props) {
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get('section')
  const tabParam = searchParams.get('tab')
  const jobIdParam = searchParams.get('jobId')
  const sectionFromUrl = useMemo(
    () =>
      sectionParam && SECTIONS.some(s => s.id === sectionParam)
        ? (sectionParam as SectionId)
        : null,
    [sectionParam]
  )

  const [theme, setTheme] = useState<ResumeTheme>(() =>
    mergeResumeTheme(DEFAULT_RESUME_THEME, profile?.resume_theme ?? null)
  )
  const [manualActive, setManualActive] = useState<SectionId | null>(null)
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(
    () => (tabParam && TAB_FROM_PARAM[tabParam]) || 'content'
  )
  /** Content tab: session-only preview filter (master is never permanently trimmed). */
  const [contentInclusion, setContentInclusion] = useState<ResumeInclusion>({})

  const {
    data,
    update,
    dirty,
    setDirty,
    saving,
    saved,
    setSaved,
    error,
    handleSave,
    handleSuggestionResolved,
    markDirty,
    router,
  } = useProfileSave({ userId, initialData, profile, theme })

  useEffect(() => {
    if (tabParam && TAB_FROM_PARAM[tabParam]) {
      setWorkspaceTab(TAB_FROM_PARAM[tabParam])
    }
  }, [tabParam])

  useEffect(() => {
    setTheme(mergeResumeTheme(DEFAULT_RESUME_THEME, profile?.resume_theme ?? null))
  }, [profile?.resume_theme])

  const active = sectionFromUrl ?? manualActive ?? 'personal'

  function setTab(next: WorkspaceTab) {
    setWorkspaceTab(next)
    if (next !== 'content') setContentInclusion({})
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const updateTheme = (patch: Partial<ResumeTheme>) => {
    setTheme(prev => mergeResumeTheme(prev, patch))
    markDirty()
  }

  const previewInclusion = workspaceTab === 'content' ? contentInclusion : {}

  const previewResume = useMemo(
    () => applyInclusion(data, previewInclusion),
    [data, previewInclusion]
  )

  const previewPane = (
    <ResumePreview data={previewResume} theme={theme} showHealth={false} />
  )

  const showPreviewAside =
    workspaceTab === 'content' || workspaceTab === 'designer'

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background -mx-0">
      {/* Teal builder top chrome */}
      <div className="sticky top-0 z-20 bg-white dark:bg-background border-b border-border">
        <div className="flex flex-nowrap items-center justify-between gap-3 px-2 md:px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link
              href="/dashboard/builder"
              className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-secondary text-muted-foreground"
              aria-label="Back to Resume Builder library"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <input
              aria-label="Resume Title"
              className="flex-1 min-w-0 h-9 px-2 text-base font-medium bg-transparent border-0 focus:outline-none focus:ring-0"
              defaultValue="Master Resume"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saved && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-brand-green">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            {dirty && !saving && (
              <span className="hidden sm:inline text-xs text-muted-foreground">Unsaved</span>
            )}
            <Button onClick={handleSave} disabled={!dirty || saving} size="sm" variant="outline" className="h-8">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
            </Button>
            <Button size="sm" className="h-8 gap-1.5" asChild>
              <Link href="/dashboard/profile">
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </Link>
            </Button>
          </div>
        </div>

        <div
          role="tablist"
          className="flex items-center gap-1 px-2 md:px-4 overflow-x-auto border-t border-border"
        >
          {(
            [
              ['content', 'Content Editor'],
              ['designer', 'Designer'],
              ['analyzer', 'Analyzer'],
              ['matcher', 'Job Matcher'],
              ['cover', 'Cover Letter'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={workspaceTab === value}
              onClick={() => setTab(value)}
              className={cn(
                'relative px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                workspaceTab === value
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
              {workspaceTab === value && (
                <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {workspaceTab === 'content' && (
          <ProfileSectionNav
            data={data}
            resumeCount={resumes.length}
            active={active}
            onSelect={id => {
              setTab('content')
              setManualActive(id)
            }}
            groups={SECTION_GROUPS}
            emailFallback={profile?.email}
            hint="Uncheck in Job Matcher to hide for a job. Master keeps everything."
            stickyClassName="lg:sticky lg:top-[105px]"
          />
        )}

        <div className="flex-1 min-w-0 flex flex-col xl:flex-row">
          <div
            className={cn(
              'flex-1 min-w-0 overflow-auto',
              workspaceTab === 'matcher' ? 'p-0' : 'p-4 md:p-6'
            )}
          >
            {error && (
              <div className="mb-4 mx-4 md:mx-6 mt-4 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            {workspaceTab === 'content' ? (
              <div className="space-y-6">
                <ContentEditor
                  data={data}
                  inclusion={contentInclusion}
                  onInclusionChange={setContentInclusion}
                  onUpdate={update}
                />
                <CollapsibleSection title="Detailed section editors" defaultOpen={false}>
                  <ProfileSectionPanel
                    active={active}
                    data={data}
                    update={update}
                    resumes={resumes}
                    githubData={githubData}
                    onSuggestionResolved={handleSuggestionResolved}
                    onGitHubSynced={() => router.refresh()}
                    savedTheme={theme}
                  />
                </CollapsibleSection>
              </div>
            ) : workspaceTab === 'designer' ? (
              <DesignerPanel
                theme={theme}
                onChange={updateTheme}
                onReset={() => {
                  setTheme({ ...DEFAULT_RESUME_THEME })
                  setDirty(true)
                  setSaved(false)
                }}
              />
            ) : workspaceTab === 'analyzer' ? (
              <AnalyzerPanel data={data} />
            ) : workspaceTab === 'matcher' ? (
              <JobMatcherPanel
                data={data}
                onUpdate={update}
                initialJobId={jobIdParam}
              />
            ) : (
              <CoverLetterPanel jobId={jobIdParam} />
            )}

            {showPreviewAside && (
              <div className="mt-4 xl:hidden">
                <CollapsibleSection title="Resume preview" defaultOpen={workspaceTab === 'designer'}>
                  {previewPane}
                </CollapsibleSection>
              </div>
            )}
          </div>

          {showPreviewAside && (
            <aside className="hidden xl:block w-[min(100%,420px)] flex-shrink-0 border-l border-border bg-neutral-50 dark:bg-secondary/20 p-4 overflow-y-auto sticky top-[105px] max-h-[calc(100vh-105px)]">
              {previewPane}
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
