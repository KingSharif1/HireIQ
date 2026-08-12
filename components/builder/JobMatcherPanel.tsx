'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ContentEditor } from '@/components/builder/ContentEditor'
import { ResumePreview } from '@/components/resume/ResumePreview'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { applyInclusion } from '@/lib/profile/inclusion'
import { DEFAULT_RESUME_THEME } from '@/lib/export/theme'
import { cn, scoreColor } from '@/lib/utils'
import type { Job, JobExtractedData, ProfileData, ResumeInclusion } from '@/types'

interface JobMatcherPanelProps {
  data: ProfileData
  onUpdate: (patch: Partial<ProfileData>) => void
  initialJobId?: string | null
  lockJobSelection?: boolean
  /** Stretch to fill a full-bleed parent (no clipped max-height). */
  fullBleed?: boolean
  onInclusionPreview?: (inclusion: ResumeInclusion) => void
  onSaved?: (result: {
    tailoredId: string
    structuredData: ReturnType<typeof applyInclusion>
    inclusion: ResumeInclusion
    score: number | null
  }) => void
}

export function JobMatcherPanel({
  data,
  onUpdate,
  initialJobId,
  lockJobSelection = false,
  fullBleed = false,
  onInclusionPreview,
  onSaved,
}: JobMatcherPanelProps) {
  const [jobs, setJobs] = useState<Pick<Job, 'id' | 'title' | 'company' | 'extracted_data'>[]>([])
  const [jobId, setJobId] = useState<string | null>(initialJobId ?? null)
  const [inclusion, setInclusion] = useState<ResumeInclusion>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tailoredId, setTailoredId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: rows } = await supabase
        .from('jobs')
        .select('id, title, company, extracted_data')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      if (!cancelled) {
        setJobs(rows ?? [])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: tr } = await supabase
        .from('tailored_resumes')
        .select('id, inclusion')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled) {
        const inc = (tr?.inclusion as ResumeInclusion) ?? {}
        setTailoredId(tr?.id ?? null)
        setInclusion(inc)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [jobId])

  useEffect(() => {
    onInclusionPreview?.(inclusion)
  }, [inclusion, onInclusionPreview])

  function setInc(next: ResumeInclusion) {
    setInclusion(next)
  }

  function selectJob(nextJobId: string | null) {
    setJobId(nextJobId)
    setInclusion({})
    setTailoredId(null)
  }

  const selected = jobs.find(j => j.id === jobId)
  const filtered = useMemo(() => applyInclusion(data, inclusion), [data, inclusion])
  const score = useMemo(() => {
    if (!selected?.extracted_data) return null
    return calculateATSScore(filtered, selected.extracted_data as JobExtractedData)
  }, [filtered, selected])

  const missingKeywords = score?.missing_keywords?.slice(0, 16) ?? []
  const matchedKeywords = score?.matched_keywords?.slice(0, 16) ?? []

  async function saveInclusion() {
    if (!jobId) return
    setSaving(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      if (tailoredId) {
        const { error } = await supabase
          .from('tailored_resumes')
          .update({
            inclusion,
            structured_data: filtered,
            match_score: score?.total ?? null,
          })
          .eq('id', tailoredId)
        if (error) throw error
      } else {
        const { data: primary } = await supabase
          .from('resumes')
          .select('id')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!primary?.id) throw new Error('Upload a resume first')
        const { data: created, error } = await supabase
          .from('tailored_resumes')
          .insert({
            user_id: user.id,
            job_id: jobId,
            base_resume_id: primary.id,
            structured_data: filtered,
            inclusion,
            match_score: score?.total ?? null,
            version: 1,
          })
          .select('id')
          .single()
        if (error) throw error
        setTailoredId(created.id)
        onSaved?.({
          tailoredId: created.id,
          structuredData: filtered,
          inclusion,
          score: score?.total ?? null,
        })
        setMessage('Saved for this job.')
        return
      }
      onSaved?.({
        tailoredId: tailoredId!,
        structuredData: filtered,
        inclusion,
        score: score?.total ?? null,
      })
      setMessage('Saved for this job.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground p-4">Loading jobs…</p>
  }

  return (
    <div
      className={cn(
        'grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]',
        fullBleed ? 'h-full min-h-0' : 'min-h-[70vh]'
      )}
    >
      {/* Left: Teal content editor with checkboxes */}
      <div
        className={cn(
          'min-w-0 border-r border-border p-4 overflow-auto',
          fullBleed ? 'min-h-0' : 'lg:max-h-[calc(100vh-220px)] lg:overflow-auto'
        )}
      >
        {!lockJobSelection && (
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <select
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={jobId ?? ''}
            onChange={e => selectJob(e.target.value || null)}
          >
            <option value="">Select a job to match…</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>
                {j.title} @ {j.company}
              </option>
            ))}
          </select>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/jobs">Add job</Link>
          </Button>
          </div>
        )}
        {!jobId ? (
          <p className="text-sm text-muted-foreground">
            Pick a job — checkboxes control what goes on that job’s resume only. Master content stays.
          </p>
        ) : (
          <ContentEditor
            data={data}
            inclusion={inclusion}
            onInclusionChange={setInc}
            onUpdate={onUpdate}
          />
        )}
      </div>

      {/* Right: match score + live preview */}
      <div
        className={cn(
          'min-w-0 bg-neutral-100/70 dark:bg-secondary/20 p-4 flex flex-col',
          fullBleed ? 'min-h-0 overflow-hidden' : 'lg:max-h-[calc(100vh-220px)] lg:overflow-auto'
        )}
      >
        {!jobId ? (
          <p className="text-sm text-muted-foreground">Match score and keywords appear here.</p>
        ) : (
          <div className={cn('space-y-4', fullBleed && 'flex flex-col min-h-0 flex-1')}>
            <div className="flex-shrink-0 space-y-4">
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-snug">
                {selected?.title}
              </h1>
              <h2 className="text-sm text-muted-foreground">{selected?.company}</h2>
            </div>

            <div className="flex items-end gap-2">
              <p className={cn('text-4xl font-bold tabular-nums', score ? scoreColor(score.total) : '')}>
                {score ? `${score.total}%` : '—'}
              </p>
              <p className="text-xs text-muted-foreground pb-1.5">Match Score</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => void saveInclusion()} disabled={saving}>
                {saving ? 'Saving…' : 'Save inclusion'}
              </Button>
              {selected && !lockJobSelection && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/tracker/${selected.id}`}>Open in Tracker</Link>
                </Button>
              )}
            </div>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}

            <details className="rounded-lg border border-border bg-background p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                Keyword details · {matchedKeywords.length} matched · {missingKeywords.length} missing
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {matchedKeywords.map((keyword, index) => (
                    <span
                      key={`m-${keyword}-${index}`}
                      className="text-[11px] rounded-md border border-brand-green/30 bg-brand-green/10 px-2 py-0.5"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {missingKeywords.map((keyword, index) => (
                    <span
                      key={`x-${keyword}-${index}`}
                      className="text-[11px] rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5"
                    >
                      {keyword}
                    </span>
                  ))}
                  {missingKeywords.length === 0 && (
                    <span className="text-xs text-muted-foreground">No missing keywords.</span>
                  )}
                </div>
              </div>
            </details>
            </div>

            <div className={cn(fullBleed && 'flex-1 min-h-0 flex flex-col')}>
              <h3 className="text-sm font-semibold mb-2 flex-shrink-0">Preview (this job)</h3>
              <div
                className={cn(
                  'rounded-lg border border-border bg-white dark:bg-background overflow-hidden',
                  fullBleed && 'flex-1 min-h-0'
                )}
              >
                <ResumePreview
                  data={filtered}
                  theme={DEFAULT_RESUME_THEME}
                  showHealth={false}
                  showTools
                  enablePan
                  className={fullBleed ? 'h-full' : undefined}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
