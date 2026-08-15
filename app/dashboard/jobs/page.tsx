'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useRef, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Link2, FileText, AlertTriangle, ArrowRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { isLinkedInJobUrl, LINKEDIN_PASTE_MESSAGE } from '@/lib/jobs/url-detect'
import type { JobExtractedData } from '@/types'
import { AiModelHint } from '@/components/ai/AiModelHint'
import { AiFlowLoader } from '@/components/ai/AiFlowLoader'

const URL_STAGES = [
  { id: 'fetch', label: 'Fetching job posting' },
  { id: 'analyze', label: 'Analyzing requirements with AI' },
  { id: 'save', label: 'Saving to your tracker' },
] as const

const PASTE_STAGES = [
  { id: 'analyze', label: 'Analyzing job description' },
  { id: 'save', label: 'Saving to your tracker' },
] as const

export default function JobsPage() {
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)
  const [loadingMode, setLoadingMode] = useState<'url' | 'paste'>('url')
  const [error, setError] = useState<string | null>(null)
  const [urlWarning, setUrlWarning] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'url' | 'paste'>('url')
  const [extractedData, setExtractedData] = useState<JobExtractedData | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const analyzeLock = useRef(false)

  const linkedInDetected = useMemo(() => isLinkedInJobUrl(url), [url])

  function handleUrlChange(value: string) {
    setUrl(value)
    setError(null)
    if (isLinkedInJobUrl(value)) {
      setUrlWarning(LINKEDIN_PASTE_MESSAGE)
    } else {
      setUrlWarning(null)
    }
  }

  async function handleFetchUrl() {
    if (!url.trim() || linkedInDetected || analyzeLock.current) return
    analyzeLock.current = true
    setLoading(true)
    setLoadingMode('url')
    setLoadingStage(0)
    setError(null)
    setUrlWarning(null)

    try {
      const scrapeRes = await fetch('/api/jobs/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const scrapeData = await scrapeRes.json()
      if (!scrapeRes.ok) {
        if (scrapeData.code === 'LINKEDIN_BLOCKED') {
          setActiveTab('paste')
          setUrlWarning(scrapeData.error)
          return
        }
        throw new Error(scrapeData.error)
      }

      if (scrapeData.warning) {
        setUrlWarning(scrapeData.warning)
      }

      setLoadingStage(1)
      const analyzeRes = await fetch('/api/jobs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: scrapeData.text,
          source: scrapeData.source,
          company: scrapeData.company,
          title: scrapeData.title,
          applyUrl: url,
          applyEase: scrapeData.applyEase,
        }),
      })
      const analyzeData = await analyzeRes.json()
      if (!analyzeRes.ok) throw new Error(analyzeData.error)

      setLoadingStage(2)
      setExtractedData(analyzeData.extractedData)
      setJobId(analyzeData.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job')
    } finally {
      analyzeLock.current = false
      setLoading(false)
    }
  }

  async function handleAnalyzeText() {
    if (!description.trim() || analyzeLock.current) return
    analyzeLock.current = true
    setLoading(true)
    setLoadingMode('paste')
    setLoadingStage(0)
    setError(null)

    try {
      const res = await fetch('/api/jobs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          applyUrl: url.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setLoadingStage(1)
      setExtractedData(data.extractedData)
      setJobId(data.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze job')
    } finally {
      analyzeLock.current = false
      setLoading(false)
    }
  }

  if (loading) {
    const stages = loadingMode === 'url' ? [...URL_STAGES] : [...PASTE_STAGES]
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <AiFlowLoader
          title={loadingMode === 'url' ? 'Getting job details' : 'Analyzing job description'}
          subtitle="We extract skills, keywords, and requirements for tailoring."
          stages={stages}
          activeIndex={loadingStage}
        />
      </div>
    )
  }

  if (extractedData && jobId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setExtractedData(null); setJobId(null) }} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Job Analyzed</h1>
            <p className="text-sm text-muted-foreground">Ready to tailor your resume</p>
          </div>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{extractedData.title || 'Job Role'}</CardTitle>
            <CardDescription>{extractedData.company} · {extractedData.work_type} · {extractedData.seniority}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {extractedData.summary && (
              <p className="text-sm text-muted-foreground">{extractedData.summary}</p>
            )}
            {extractedData.apply_ease === 'easy' ? (
              <p className="text-sm text-foreground">
                HireIQ can auto-apply here — this looks like a public form.
              </p>
            ) : extractedData.apply_ease === 'hard' ? (
              <p className="text-sm text-muted-foreground">
                This looks like an account portal. Auto-apply stays hidden; open the employer site.
              </p>
            ) : null}

            {extractedData.required_skills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {extractedData.required_skills.map(skill => (
                    <Badge key={skill} variant="default">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {extractedData.preferred_skills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Nice to Have</p>
                <div className="flex flex-wrap gap-1.5">
                  {extractedData.preferred_skills.slice(0, 6).map(skill => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {extractedData.red_flags.length > 0 && (
              <div className="flex items-start gap-2 bg-brand-amber/10 border border-brand-amber/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-brand-amber flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-brand-amber mb-1">Heads Up</p>
                  {extractedData.red_flags.map((flag, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{flag}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button className="w-full" asChild size="lg">
          <Link href={`/dashboard/tracker/${jobId}?tab=documents&docMode=choose`}>
            Tailor resume for this job
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Applications</p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Add a job</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Paste the description or drop a careers URL</p>
          <div className="mt-1"><AiModelHint uses="strong" /></div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'url' | 'paste')}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="url" className="flex-1">
            <Link2 className="w-3.5 h-3.5 mr-1.5" />
            Job URL
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex-1">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Paste Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-3">
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                Works with Greenhouse, Lever, Ashby, Workday, and most career sites.
                LinkedIn URLs must be pasted as text.
              </p>
              <Input
                placeholder="https://company.wd1.myworkdayjobs.com/... or greenhouse.io/..."
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={loading}
              />
              {linkedInDetected && (
                <div className="rounded-lg border border-brand-amber/30 bg-brand-amber/10 p-3 space-y-2">
                  <p className="text-sm text-foreground">{LINKEDIN_PASTE_MESSAGE}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('paste')}
                  >
                    Switch to Paste Text
                  </Button>
                </div>
              )}
              {urlWarning && !linkedInDetected && (
                <div className="flex items-start gap-2 text-sm text-brand-amber bg-brand-amber/10 border border-brand-amber/20 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{urlWarning}</p>
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={handleFetchUrl}
                disabled={!url.trim() || loading || linkedInDetected}
                className="w-full"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Fetching…</> : 'Fetch & Analyze'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paste" className="space-y-3">
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                Copy the full job description and paste it below.
                {url.trim() && linkedInDetected && ' Your LinkedIn URL will be saved as the apply link.'}
              </p>
              <Textarea
                placeholder="Paste the full job description here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                className="min-h-[200px]"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={handleAnalyzeText}
                disabled={description.trim().length < 50 || loading}
                className="w-full"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing…</> : 'Analyze Job Description'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
