'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ContentEditor } from '@/components/builder/ContentEditor'
import { DesignerPanel } from '@/components/builder/designer/DesignerPanel'
import { AnalyzerPanel } from '@/components/builder/AnalyzerPanel'
import { LayoutIssuesBanner } from '@/components/jobs/detail/LayoutIssuesBanner'
import { ResumePreview } from '@/components/resume/ResumePreview'
import { applyInclusion } from '@/lib/profile/inclusion'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { createClient } from '@/lib/supabase/client'
import {
  DEFAULT_RESUME_THEME,
  mergeResumeTheme,
  type ResumeTheme,
} from '@/lib/export/theme'
import type { JobExtractedData, ProfileData, ResumeInclusion, StructuredResume } from '@/types'

type EditorTab = 'content' | 'designer' | 'analyzer'

const TABS: { id: EditorTab; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'designer', label: 'Design' },
  { id: 'analyzer', label: 'Analyze' },
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
  const [tab, setTab] = useState<EditorTab>('content')
  const [inclusion, setInclusion] = useState<ResumeInclusion>({})
  const [theme, setTheme] = useState<ResumeTheme>(() => mergeResumeTheme(DEFAULT_RESUME_THEME, null))
  const [tailoredId, setTailoredId] = useState<string | null>(null)
  const [jobData, setJobData] = useState<JobExtractedData | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(1)

  const previewData = useMemo(() => applyInclusion(data, inclusion), [data, inclusion])
  const score = useMemo(() => {
    if (!jobData) return null
    return calculateATSScore(previewData, jobData)
  }, [jobData, previewData])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: latest }, { data: job }] = await Promise.all([
        supabase
          .from('tailored_resumes')
          .select('id, inclusion')
          .eq('user_id', user.id)
          .eq('job_id', jobId)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('jobs')
          .select('extracted_data')
          .eq('user_id', user.id)
          .eq('id', jobId)
          .maybeSingle(),
      ])
      if (cancelled) return
      setTailoredId(latest?.id ?? null)
      setInclusion((latest?.inclusion as ResumeInclusion | null) ?? {})
      setJobData((job?.extracted_data as JobExtractedData | null) ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [jobId])

  async function saveTailoredResume() {
    setSaving(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const nextScore = score?.total ?? null
      if (tailoredId) {
        const { error } = await supabase
          .from('tailored_resumes')
          .update({
            inclusion,
            structured_data: previewData,
            match_score: nextScore,
            theme_override: theme,
          })
          .eq('id', tailoredId)
          .eq('user_id', user.id)
        if (error) throw error
        onSaved({ tailoredId, structuredData: previewData, score: nextScore })
      } else {
        const { data: primary } = await supabase
          .from('resumes')
          .select('id')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!primary?.id) throw new Error('Import a resume before creating a tailored version.')
        const { data: created, error } = await supabase
          .from('tailored_resumes')
          .insert({
            user_id: user.id,
            job_id: jobId,
            base_resume_id: primary.id,
            structured_data: previewData,
            inclusion,
            match_score: nextScore,
            theme_override: theme,
            version: 1,
          })
          .select('id')
          .single()
        if (error) throw error
        setTailoredId(created.id)
        onSaved({ tailoredId: created.id, structuredData: previewData, score: nextScore })
      }
      setMessage('Saved to this job only.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

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
          <div className="flex items-center gap-2">
            {score ? (
              <span className="hidden text-xs font-semibold text-muted-foreground sm:inline">
                {score.total}% match
              </span>
            ) : null}
            <Button type="button" size="sm" onClick={() => void saveTailoredResume()} disabled={saving}>
              {saving ? 'Saving...' : 'Save job resume'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onDone}>
              Done
            </Button>
          </div>
        </div>
        {message ? <p className="px-3 pb-2 text-xs text-muted-foreground md:px-4">{message}</p> : null}
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
        <div className="flex-1 min-w-0 min-h-0 overflow-auto border-r border-border p-4 md:p-6 lg:max-w-[46%] lg:min-w-[22rem] lg:resize-x">
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
      </div>
    </div>
  )
}
