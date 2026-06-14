'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCompletion } from '@ai-sdk/react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { ResumePreview } from '@/components/resume/ResumePreview'
import { MatchScore } from '@/components/tailor/MatchScore'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, Download, FileText, Mail, Sparkles, Loader2,
  ExternalLink, MapPin, Building2, CheckCircle2, Copy, Check, HelpCircle,
} from 'lucide-react'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import {
  APPLICATION_STATUSES, applicationStatusClasses, tailoringStatusLabel,
} from '@/lib/jobs/status'
import type { ApplicationStatus, Job, TailoredResume } from '@/types'

interface JobHubProps {
  job: Job
  versions: TailoredResume[]
}

/** Recommended page length by seniority (entry-level should stay one page). */
function recommendedPagesFor(seniority?: string): number {
  const s = (seniority || '').toLowerCase()
  if (/(intern|entry|junior|new grad|associate)/.test(s)) return 1
  if (/(senior|staff|principal|lead|director|manager)/.test(s)) return 2
  return 1
}

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
}

export function JobHub({ job, versions }: JobHubProps) {
  const [appStatus, setAppStatus] = useState<ApplicationStatus>(job.application_status)
  const [savingStatus, setSavingStatus] = useState(false)
  const [selectedId, setSelectedId] = useState(versions[0]?.id ?? '')
  const [docTab, setDocTab] = useState<'resume' | 'cover'>('resume')
  const [exporting, setExporting] = useState<string | null>(null)
  const [coverText, setCoverText] = useState('')
  const [coverForId, setCoverForId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const selected = versions.find(v => v.id === selectedId) ?? versions[0] ?? null

  const { complete, completion, isLoading: generatingCover } = useCompletion({
    api: '/api/tailor/cover-letter',
  })

  // Reset the editable cover text when the selected version changes (render-time
  // adjustment — the React-recommended alternative to a syncing effect).
  if (selected && coverForId !== selected.id) {
    setCoverForId(selected.id)
    setCoverText(selected.cover_letter || '')
  }

  const fitScore = useMemo(() => {
    if (!selected || !job.extracted_data) return null
    return calculateATSScore(selected.structured_data, job.extracted_data)
  }, [selected, job.extracted_data])

  const recommendedPages = recommendedPagesFor(job.extracted_data?.seniority)

  async function handleStatusChange(value: ApplicationStatus) {
    setAppStatus(value)
    setSavingStatus(true)
    const supabase = createClient()
    await supabase
      .from('jobs')
      .update({ application_status: value, updated_at: new Date().toISOString() })
      .eq('id', job.id)
    setSavingStatus(false)
  }

  async function handleExport(format: 'pdf' | 'docx', type: 'resume' | 'cover' = 'resume') {
    if (!selected) return
    setExporting(`${type}-${format}`)
    try {
      const res = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailoredResumeId: selected.id, type }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const kind = type === 'cover' ? 'cover-letter' : 'resume'
      a.href = url
      a.download = `${job.company || kind}-${job.title || kind}-${kind}.${format}`.replace(/\s+/g, '_')
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not export. Try again.')
    } finally {
      setExporting(null)
    }
  }

  async function handleGenerateCover() {
    if (!selected) return
    const result = await complete('', { body: { tailoredResumeId: selected.id } })
    if (result) {
      try {
        const parsed = JSON.parse(result.slice(result.indexOf('{'), result.lastIndexOf('}') + 1))
        setCoverText(parsed.cover_letter || result)
      } catch {
        setCoverText(result)
      }
    }
  }

  async function handleCopyCover() {
    await navigator.clipboard.writeText(generatingCover ? completion : coverText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayedCover = generatingCover ? completion : coverText

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        {...fadeUp}
        className="flex items-center gap-3 mb-6 rounded-2xl border border-border bg-gradient-to-r from-brand-purple/10 via-card to-card p-4"
      >
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1.5 hover:bg-secondary"
          aria-label="Back to applications"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="w-11 h-11 rounded-xl bg-brand-purple/15 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-brand-purple" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-foreground truncate">{job.title || 'Job'}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {job.company}{job.location ? ` · ${job.location}` : ''}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/dashboard/tailor?jobId=${job.id}`}>
            <Sparkles className="w-4 h-4" />
            {versions.length > 0 ? 'Tailor again' : 'Tailor'}
          </Link>
        </Button>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Center: tabbed content */}
        <motion.div {...fadeUp} className="flex-1 min-w-0">
          <Tabs defaultValue="documents">
            <TabsList>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="questions">
                Questions
                {selected?.gap_answers?.length ? (
                  <Badge variant="muted" className="ml-1.5 px-1.5 py-0 text-[10px]">
                    {selected.gap_answers.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            {/* DOCUMENTS */}
            <TabsContent value="documents">
              {!selected ? (
                <Card>
                  <CardContent className="py-12 text-center space-y-3">
                    <FileText className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-sm text-muted-foreground">No tailored resume yet for this job.</p>
                    <Button asChild>
                      <Link href={`/dashboard/tailor?jobId=${job.id}`}>Tailor now</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-lg border border-border p-0.5">
                        <button
                          onClick={() => setDocTab('resume')}
                          className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                            docTab === 'resume' ? 'bg-brand-purple/15 text-brand-purple' : 'text-muted-foreground hover:text-foreground')}
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => setDocTab('cover')}
                          className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                            docTab === 'cover' ? 'bg-brand-purple/15 text-brand-purple' : 'text-muted-foreground hover:text-foreground')}
                        >
                          Cover Letter
                        </button>
                      </div>

                      {versions.length > 1 && (
                        <select
                          value={selectedId}
                          onChange={e => setSelectedId(e.target.value)}
                          className="h-8 rounded-md border border-border bg-input px-2 text-xs text-foreground"
                        >
                          {versions.map(v => (
                            <option key={v.id} value={v.id}>
                              v{v.version} · {new Date(v.created_at).toLocaleDateString()}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {docTab === 'resume' && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={exporting !== null} onClick={() => handleExport('pdf')}>
                          {exporting === 'resume-pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          PDF
                        </Button>
                        <Button variant="outline" size="sm" disabled={exporting !== null} onClick={() => handleExport('docx')}>
                          {exporting === 'resume-docx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          DOCX
                        </Button>
                      </div>
                    )}

                    {docTab === 'cover' && displayedCover && !generatingCover && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={exporting !== null} onClick={() => handleExport('pdf', 'cover')}>
                          {exporting === 'cover-pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          PDF
                        </Button>
                        <Button variant="outline" size="sm" disabled={exporting !== null} onClick={() => handleExport('docx', 'cover')}>
                          {exporting === 'cover-docx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          DOCX
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Resume preview / Cover letter */}
                  {docTab === 'resume' ? (
                    <ResumePreview
                      data={selected.structured_data}
                      recommendedPages={recommendedPages}
                      showHealth
                    />
                  ) : (
                    <Card>
                      <CardContent className="p-6">
                        {displayedCover ? (
                          <div className="space-y-3">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={handleCopyCover}>
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied' : 'Copy'}
                              </Button>
                              <Button variant="outline" size="sm" disabled={generatingCover} onClick={handleGenerateCover}>
                                {generatingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                Regenerate
                              </Button>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                              {displayedCover}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center py-8 space-y-3">
                            <Mail className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                            <p className="text-sm text-muted-foreground">No cover letter yet for this version.</p>
                            <Button size="sm" disabled={generatingCover} onClick={handleGenerateCover}>
                              {generatingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              Generate cover letter
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* QUESTIONS */}
            <TabsContent value="questions">
              <Card>
                <CardContent className="p-6">
                  {selected?.gap_answers?.length ? (
                    <div className="space-y-5">
                      <p className="text-xs text-muted-foreground">
                        The AI asked these to fill gaps for this role. Your answers shaped the tailored resume below.
                      </p>
                      <ul className="space-y-3">
                        {selected.gap_answers.map((qa, i) => (
                          <li
                            key={i}
                            className="rounded-xl border border-border bg-card/40 p-4 space-y-2.5"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-purple/15 text-[10px] font-semibold text-brand-purple">
                                Q
                              </span>
                              <p className="text-sm font-medium text-foreground leading-snug">{qa.question}</p>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-[10px] font-semibold text-brand-green">
                                A
                              </span>
                              <p className="text-sm text-muted-foreground leading-relaxed">{qa.answer}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-2">
                      <HelpCircle className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        No gap questions were answered for this version.
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        When you tailor, the AI may ask a few questions to fill gaps in your profile.
                        Your answers are saved here for next time.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Right sidebar — collapsible sections */}
        <motion.aside
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.05 }}
          className="lg:w-72 flex-shrink-0 space-y-3"
        >
          <CollapsibleSection title="Job Fit Score">
            {fitScore ? (
              <MatchScore score={fitScore} compact />
            ) : (
              <p className="text-sm text-muted-foreground">Tailor this job to see a fit score.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Application">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={appStatus}
                  onChange={e => handleStatusChange(e.target.value as ApplicationStatus)}
                  className={cn(
                    'mt-1 w-full h-9 rounded-lg border px-2 text-sm font-medium',
                    applicationStatusClasses(appStatus)
                  )}
                >
                  {APPLICATION_STATUSES.map(s => (
                    <option key={s.value} value={s.value} className="bg-card text-foreground">
                      {s.label}
                    </option>
                  ))}
                </select>
                {savingStatus && <p className="text-[10px] text-muted-foreground mt-1">Saving…</p>}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tailoring</span>
                <span className="flex items-center gap-1 text-foreground">
                  {versions.length > 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" /> : null}
                  {versions.length > 0 ? tailoringStatusLabel('tailored') : tailoringStatusLabel('not_started')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Versions</span>
                <span className="text-foreground">{versions.length}</span>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Timeline">
            <ol className="space-y-4">
              <TimelineRow icon={Building2} label="Job added" date={job.created_at} />
              {[...versions].reverse().map(v => (
                <TimelineRow
                  key={v.id}
                  icon={Sparkles}
                  label={`Resume tailored (v${v.version})${v.tailored_score != null ? ` · ${v.tailored_score}% fit` : ''}`}
                  date={v.created_at}
                />
              ))}
            </ol>
          </CollapsibleSection>

          <CollapsibleSection title="Job details" defaultOpen={false}>
            <div className="space-y-2">
              <DetailRow icon={Building2} text={job.company || '—'} />
              {job.location && <DetailRow icon={MapPin} text={job.location} />}
              {job.extracted_data?.seniority && <DetailRow icon={FileText} text={job.extracted_data.seniority} />}
              {job.apply_url && (
                <a
                  href={job.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-brand-purple hover:underline mt-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View original posting
                </a>
              )}
            </div>
          </CollapsibleSection>
        </motion.aside>
      </div>
    </div>
  )
}

function TimelineRow({ icon: Icon, label, date }: { icon: typeof Building2; label: string; date: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-brand-purple" />
      </div>
      <div>
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{new Date(date).toLocaleString()}</p>
      </div>
    </li>
  )
}

function DetailRow({ icon: Icon, text }: { icon: typeof Building2; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-foreground">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  )
}
