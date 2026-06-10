'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Link2, FileText, AlertTriangle, ArrowRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { JobExtractedData } from '@/types'

export default function JobsPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<JobExtractedData | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [scrapedText, setScrapedText] = useState<string | null>(null)

  async function handleFetchUrl() {
    if (!url.trim()) return
    setLoading(true)
    setError(null)

    try {
      const scrapeRes = await fetch('/api/jobs/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const scrapeData = await scrapeRes.json()
      if (!scrapeRes.ok) throw new Error(scrapeData.error)

      setScrapedText(scrapeData.text)

      const analyzeRes = await fetch('/api/jobs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: scrapeData.text,
          source: scrapeData.source,
          company: scrapeData.company,
          title: scrapeData.title,
          applyUrl: url,
        }),
      })
      const analyzeData = await analyzeRes.json()
      if (!analyzeRes.ok) throw new Error(analyzeData.error)

      setExtractedData(analyzeData.extractedData)
      setJobId(analyzeData.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job')
    } finally {
      setLoading(false)
    }
  }

  async function handleAnalyzeText() {
    if (!description.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/jobs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setExtractedData(data.extractedData)
      setJobId(data.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze job')
    } finally {
      setLoading(false)
    }
  }

  if (extractedData && jobId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setExtractedData(null); setJobId(null) }} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Job Analyzed</h1>
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
          <Link href={`/dashboard/tailor?jobId=${jobId}`}>
            Tailor My Resume to This Job
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Add a Job</h1>
          <p className="text-sm text-muted-foreground">Paste the description or drop the URL</p>
        </div>
      </div>

      <Tabs defaultValue="url">
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
                Works with Greenhouse, Lever, Ashby, and most job boards.
              </p>
              <Input
                placeholder="https://boards.greenhouse.io/company/jobs/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                onClick={handleFetchUrl}
                disabled={!url.trim() || loading}
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
