'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn, scoreColor } from '@/lib/utils'
import { ContentEditor } from '@/components/builder/ContentEditor'
import { DesignerPanel } from '@/components/builder/designer/DesignerPanel'
import { AnalyzerPanel } from '@/components/builder/AnalyzerPanel'
import { LayoutIssuesBanner } from '@/components/jobs/detail/LayoutIssuesBanner'
import { ResumePreview } from '@/components/resume/ResumePreview'
import { applyInclusion } from '@/lib/profile/inclusion'
import { structuredResumeToProfileData, profileDataToStructuredResume } from '@/lib/profile/data'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { createClient } from '@/lib/supabase/client'
import { buildResumeChanges } from '@/lib/ai/tailor-engine'
import {
  withChangeIds,
  initialDecisions,
  buildApprovedResume,
} from '@/lib/tailor/change-decisions'
import { highlightsFromChanges, isNewAddition } from '@/lib/tailor/change-copy'
import { buildJobOptimizedInclusion } from '@/lib/tailor/job-relevance'
import {
  DEFAULT_RESUME_THEME,
  mergeResumeTheme,
  type ResumeTheme,
  type ResumeThemeOverride,
} from '@/lib/export/theme'
import type {
  ChangeDecision,
  JobExtractedData,
  ProfileData,
  ResumeDiffChange,
  ResumeInclusion,
  StructuredResume,
} from '@/types'
import { Eye, FileText, Palette, Sparkles } from 'lucide-react'

type EditorTab = 'content' | 'designer' | 'analyzer'

const DESKTOP_TABS: { id: EditorTab; label: string; icon: typeof FileText }[] = [
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'designer', label: 'Design', icon: Palette },
  { id: 'analyzer', label: 'Match', icon: Sparkles },
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
  jobExtracted?: JobExtractedData | null
}

function seedEditorData(master: ProfileData, tailored: StructuredResume | null): ProfileData {
  if (!tailored) return master
  const fromTailored = structuredResumeToProfileData(tailored)
  return {
    ...master,
    summary: fromTailored.summary || master.summary,
    experience: fromTailored.experience.length ? fromTailored.experience : master.experience,
    education: fromTailored.education.length ? fromTailored.education : master.education,
    skills: {
      ...master.skills,
      ...fromTailored.skills,
    },
    projects: fromTailored.projects.length ? fromTailored.projects : master.projects,
    certifications: fromTailored.certifications.length
      ? fromTailored.certifications
      : master.certifications,
    personal: {
      ...master.personal,
      firstName: fromTailored.personal.firstName || master.personal.firstName,
      lastName: fromTailored.personal.lastName || master.personal.lastName,
      email: fromTailored.personal.email || master.personal.email,
      phone: fromTailored.personal.phone || master.personal.phone,
      location: fromTailored.personal.location || master.personal.location,
      headline: fromTailored.personal.headline || master.personal.headline,
    },
  }
}

function patchProfile(prev: ProfileData, patch: Partial<ProfileData>): ProfileData {
  return {
    ...prev,
    ...patch,
    personal: patch.personal ?? prev.personal,
    skills: patch.skills ?? prev.skills,
  }
}

function contentHighlightIds(changes: ResumeDiffChange[]): string[] {
  const ids: string[] = []
  for (const change of changes) {
    if (change.section === 'summary') ids.push('summary')
    if (change.section === 'skills') ids.push('skills')
    if (change.expId) ids.push(change.expId)
    if (change.projId) ids.push(change.projId)
  }
  return ids
}

function newAdditionHighlightIds(changes: ResumeDiffChange[]): string[] {
  return contentHighlightIds(changes.filter(isNewAddition))
}

/**
 * Full-bleed Teal workspace for a single job's tailored resume.
 * Edits stay on this snapshot — master profile is not written.
 */
export function JobResumeEditor({
  jobId,
  data,
  onDone,
  onSaved,
  jobExtracted = null,
}: JobResumeEditorProps) {
  const [tab, setTab] = useState<EditorTab>('content')
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit')
  const [draft, setDraft] = useState<ProfileData>(() => data)
  const [inclusion, setInclusion] = useState<ResumeInclusion>({})
  const [theme, setTheme] = useState<ResumeTheme>(() => mergeResumeTheme(DEFAULT_RESUME_THEME, null))
  const [tailoredId, setTailoredId] = useState<string | null>(null)
  const [jobData, setJobData] = useState<JobExtractedData | null>(jobExtracted)
  const [original, setOriginal] = useState<StructuredResume | null>(null)
  const [storedChanges, setStoredChanges] = useState<ResumeDiffChange[]>([])
  const [decisions, setDecisions] = useState<Record<string, ChangeDecision>>({})
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(1)
  const [isNarrow, setIsNarrow] = useState(false)
  const masterRef = useRef(data)
  masterRef.current = data

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const includedDraft = useMemo(() => applyInclusion(draft, inclusion), [draft, inclusion])

  const liveChanges = useMemo(() => {
    const from = original
    const live = from ? buildResumeChanges(from, includedDraft) : []
    if (live.length > 0) return withChangeIds(live)
    return withChangeIds(storedChanges)
  }, [original, includedDraft, storedChanges])

  const previewData = useMemo(() => {
    if (!original || liveChanges.length === 0) return includedDraft
    return buildApprovedResume(original, includedDraft, liveChanges, decisions)
  }, [original, includedDraft, liveChanges, decisions])

  const score = useMemo(() => {
    if (!jobData) return null
    return calculateATSScore(previewData, jobData)
  }, [jobData, previewData])

  const previewHighlights = useMemo(
    () => (liveChanges.length ? highlightsFromChanges(liveChanges, selectedChangeId) : null),
    [liveChanges, selectedChangeId]
  )

  const editorHighlightIds = useMemo(() => {
    const focused = selectedChangeId
      ? liveChanges.filter(c => c.id === selectedChangeId)
      : liveChanges
    return contentHighlightIds(focused)
  }, [liveChanges, selectedChangeId])

  const newIds = useMemo(() => newAdditionHighlightIds(liveChanges), [liveChanges])

  useEffect(() => {
    if (liveChanges.length === 0) return
    setDecisions(prev => {
      const next = { ...prev }
      let changed = false
      for (const change of liveChanges) {
        const id = change.id!
        if (!next[id]) {
          next[id] = { status: isNewAddition(change) ? 'pending' : 'accepted' }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [liveChanges])

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
          .select(
            'id, inclusion, structured_data, original_structured_data, changes, change_decisions, theme_override'
          )
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
      const extracted = (job?.extracted_data as JobExtractedData | null) ?? jobExtracted
      setJobData(extracted ?? null)
      const structured = (latest?.structured_data as StructuredResume | null) ?? null
      const master = masterRef.current
      if (structured) {
        setDraft(seedEditorData(master, structured))
        setInclusion((latest?.inclusion as ResumeInclusion | null) ?? {})
      } else {
        setDraft(master)
        setInclusion(buildJobOptimizedInclusion(master, extracted))
      }
      setOriginal(
        (latest?.original_structured_data as StructuredResume | null) ??
          (structured ? profileDataToStructuredResume(master) : null)
      )
      const changes = withChangeIds((latest?.changes as ResumeDiffChange[] | null) ?? [])
      setStoredChanges(changes)
      setDecisions(
        (latest?.change_decisions as Record<string, ChangeDecision> | null) ??
          initialDecisions(changes)
      )
      setTheme(
        mergeResumeTheme(
          DEFAULT_RESUME_THEME,
          (latest?.theme_override as ResumeThemeOverride | null) ?? null
        )
      )
      if (changes.length > 0) {
        setSelectedChangeId(changes[0].id ?? null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [jobId, jobExtracted])

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
            tailored_score: nextScore,
            theme_override: theme,
            changes: liveChanges,
            change_decisions: decisions,
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
            original_structured_data: original ?? profileDataToStructuredResume(draft),
            inclusion,
            match_score: nextScore,
            tailored_score: nextScore,
            theme_override: theme,
            changes: liveChanges,
            change_decisions: decisions,
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

  function selectChange(id: string | null) {
    setSelectedChangeId(id)
    if (id && isNarrow) setMobilePane('preview')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background pb-20 md:pb-0 md:left-[68px]">
      <header className="flex-shrink-0 border-b border-border">
        <div className="flex items-center justify-between gap-2 px-3 py-2 md:px-4">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground">Build resume</h1>
            <p className="truncate text-[11px] text-muted-foreground">
              Tap Edit to change text · preview updates live · this job only
            </p>
          </div>
          <div className="flex items-center gap-2">
            {score ? (
              <span
                className={cn(
                  'rounded-md border border-border px-2 py-0.5 text-xs font-bold tabular-nums',
                  scoreColor(score.total)
                )}
              >
                {score.total}%
              </span>
            ) : null}
            <Button type="button" variant="outline" size="sm" className="hidden sm:inline-flex" onClick={onDone}>
              Done
            </Button>
            <Button
              type="button"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => void saveTailoredResume()}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save & score'}
            </Button>
          </div>
        </div>

        {message ? <p className="px-3 pb-1 text-xs text-muted-foreground md:px-4">{message}</p> : null}

        <div className="flex border-t border-border md:hidden">
          {(['edit', 'preview'] as const).map(pane => (
            <button
              key={pane}
              type="button"
              onClick={() => setMobilePane(pane)}
              className={cn(
                'flex-1 py-2.5 text-xs font-medium capitalize transition-colors',
                mobilePane === pane ? 'bg-secondary/60 text-foreground' : 'text-muted-foreground'
              )}
            >
              {pane === 'preview' ? (
                <span className="inline-flex items-center justify-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> Preview
                </span>
              ) : (
                'Edit'
              )}
            </button>
          ))}
        </div>

        <div
          role="tablist"
          className={cn(
            'flex items-center gap-0.5 overflow-x-auto border-t border-border px-2 md:px-4',
            mobilePane === 'preview' ? 'hidden md:flex' : 'flex'
          )}
        >
          <div className="flex">
            {DESKTOP_TABS.map(item => (
              <TabButton
                key={item.id}
                item={item}
                active={tab === item.id}
                onSelect={() => setTab(item.id)}
                compact
              />
            ))}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 flex flex-col lg:flex-row">
        <div
          className={cn(
            'min-w-0 flex-1 overflow-auto border-r border-border p-4 md:p-6 lg:max-w-[46%] lg:min-w-[22rem]',
            mobilePane === 'preview' ? 'hidden lg:block' : 'block'
          )}
        >
          {tab === 'content' ? (
            <ContentEditor
              data={draft}
              inclusion={inclusion}
              onInclusionChange={setInclusion}
              onUpdate={patch => setDraft(prev => patchProfile(prev, patch))}
              highlightIds={editorHighlightIds}
              newAdditionIds={newIds}
            />
          ) : null}
          {tab === 'designer' ? (
            <DesignerPanel
              theme={theme}
              mobileSimple={isNarrow}
              onChange={patch => setTheme(prev => mergeResumeTheme(prev, patch))}
              onReset={() => setTheme({ ...DEFAULT_RESUME_THEME })}
            />
          ) : null}
          {tab === 'analyzer' ? (
            <AnalyzerPanel
              data={draft}
              score={score}
              job={jobData}
              changes={liveChanges}
              selectedChangeId={selectedChangeId}
              onSelectChange={selectChange}
              decisions={decisions}
              onDecision={(id, status) =>
                setDecisions(prev => ({ ...prev, [id]: { ...prev[id], status } }))
              }
            />
          ) : null}
        </div>

        <div
          className={cn(
            'min-h-0 flex-1 flex-col bg-neutral-100/80 dark:bg-secondary/20',
            mobilePane === 'edit' ? 'hidden lg:flex' : 'flex'
          )}
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 md:p-4">
            {liveChanges.length > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Teal highlights = tailored updates
                {selectedChangeId ? ' (focused change)' : ''}. Tap a change in Match to jump here on mobile.
              </p>
            ) : null}
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
              highlights={previewHighlights}
              className="h-full min-h-[360px] lg:min-h-[480px]"
              onPageCount={setPageCount}
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 z-[60] flex gap-2 border-t border-border bg-background/95 p-3 backdrop-blur-md md:hidden">
        <Button type="button" variant="outline" className="flex-1" onClick={onDone}>
          Done
        </Button>
        <Button
          type="button"
          className="flex-[2]"
          onClick={() => void saveTailoredResume()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save & score'}
        </Button>
      </div>
    </div>
  )
}

function TabButton({
  item,
  active,
  onSelect,
  compact,
}: {
  item: (typeof DESKTOP_TABS)[number]
  active: boolean
  onSelect: () => void
  compact?: boolean
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'relative inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {compact ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{item.label}</span>
      {active ? (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal-600 dark:bg-teal-400" />
      ) : null}
    </button>
  )
}
