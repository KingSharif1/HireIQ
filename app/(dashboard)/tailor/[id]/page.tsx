'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCompletion } from '@ai-sdk/react'
import { MatchScore } from '@/components/tailor/MatchScore'
import { TailorDiff } from '@/components/tailor/TailorDiff'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Download, FileText, Sparkles, TrendingUp, ArrowUp,
  Loader2, RefreshCw, Copy, Check
} from 'lucide-react'
import { scoreRingColor, scoreLabel } from '@/lib/utils'
import type { TailoredResume, ATSScore } from '@/types'

export default function TailoredResultPage() {
  const { id } = useParams<{ id: string }>()

  const [tailored, setTailored] = useState<TailoredResume | null>(null)
  const [originalData, setOriginalData] = useState<TailoredResume['structured_data'] | null>(null)
  const [atsScore, setAtsScore] = useState<ATSScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingCover, setEditingCover] = useState(false)
  const [coverText, setCoverText] = useState('')
  const [copied, setCopied] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)

  const { complete, completion, isLoading: generatingCover } = useCompletion({
    api: '/api/tailor/cover-letter',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: tr } = await supabase
        .from('tailored_resumes')
        .select('*, resumes(structured_data)')
        .eq('id', id)
        .single()

      if (!tr) return

      setTailored(tr)
      setCoverText(tr.cover_letter || '')

      if (tr.resumes) {
        setOriginalData((tr.resumes as { structured_data: TailoredResume['structured_data'] }).structured_data)
      }

      if (tr.job_id) {
        const { data: job } = await supabase.from('jobs').select('extracted_data').eq('id', tr.job_id).single()
        if (job?.extracted_data && tr.structured_data) {
          const { calculateATSScore } = await import('@/lib/scoring/ats-scorer')
          const score = calculateATSScore(tr.structured_data, job.extracted_data)
          setAtsScore(score)
        }
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function handleGenerateCoverLetter() {
    const result = await complete('', {
      body: { tailoredResumeId: id },
    })
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
    await navigator.clipboard.writeText(coverText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleExport(format: 'pdf' | 'docx') {
    const setter = format === 'pdf' ? setExportingPdf : setExportingDocx

    setter(true)
    try {
      const res = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailoredResumeId: id }),
      })

      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `resume.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setter(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!tailored) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Tailored resume not found.</p>
      </div>
    )
  }

  const scoreDiff = (tailored.tailored_score ?? 0) - (tailored.match_score ?? 0)
  const currentDisplayCover = generatingCover ? completion : coverText

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Tailored Resume</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(tailored.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('docx')}
            disabled={exportingDocx}
          >
            {exportingDocx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            DOCX
          </Button>
          <Button
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={exportingPdf}
          >
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Score improvement card */}
      <Card className="mb-6 border-brand-green/20 bg-brand-green/5">
        <CardContent className="p-5">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Before</p>
              <p className="text-2xl font-bold" style={{ color: scoreRingColor(tailored.match_score ?? 0) }}>
                {tailored.match_score ?? '--'}
              </p>
            </div>
            <div className="flex-1 flex items-center gap-2 min-w-[80px]">
              <div className="flex-1 h-0.5 bg-border" />
              <div className="flex items-center gap-1 text-brand-green bg-brand-green/10 px-2 py-1 rounded-full">
                <ArrowUp className="w-3 h-3" />
                <span className="text-xs font-bold">+{scoreDiff}</span>
              </div>
              <div className="flex-1 h-0.5 bg-border" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">After</p>
              <p className="text-2xl font-bold" style={{ color: scoreRingColor(tailored.tailored_score ?? 0) }}>
                {tailored.tailored_score ?? '--'}
              </p>
            </div>
            <div className="flex-1 min-w-[150px]">
              <p className="font-semibold text-brand-green">{scoreLabel(tailored.tailored_score ?? 0)}</p>
              <p className="text-xs text-muted-foreground">ATS match after tailoring</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main tabs */}
      <Tabs defaultValue="resume">
        <TabsList className="mb-4">
          <TabsTrigger value="resume">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Tailored Resume
          </TabsTrigger>
          <TabsTrigger value="diff">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            What Changed
          </TabsTrigger>
          <TabsTrigger value="cover">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Cover Letter
          </TabsTrigger>
        </TabsList>

        {/* Tailored Resume Tab */}
        <TabsContent value="resume">
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Contact */}
              <div>
                <h2 className="text-xl font-bold text-white">{tailored.structured_data.contact?.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {[
                    tailored.structured_data.contact?.email,
                    tailored.structured_data.contact?.phone,
                    tailored.structured_data.contact?.location,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>

              {/* Summary */}
              {tailored.structured_data.summary && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
                  <p className="text-sm text-foreground leading-relaxed">{tailored.structured_data.summary}</p>
                </div>
              )}

              {/* Experience */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Experience</p>
                <div className="space-y-5">
                  {tailored.structured_data.experience?.map((exp) => (
                    <div key={exp.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-white">{exp.title}</p>
                          <p className="text-xs text-muted-foreground">{exp.company} · {exp.location}</p>
                        </div>
                        <p className="text-xs text-muted-foreground flex-shrink-0">
                          {exp.startDate} – {exp.endDate}
                        </p>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {exp.bullets?.map((bullet, i) => (
                          <li key={i} className="text-sm text-foreground flex gap-2">
                            <span className="text-muted-foreground mt-0.5">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              {tailored.structured_data.skills && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ...(tailored.structured_data.skills.technical || []),
                      ...(tailored.structured_data.skills.tools || []),
                    ].slice(0, 20).map(skill => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diff Tab */}
        <TabsContent value="diff">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Changes Made</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {originalData && tailored.changes && (
                <TailorDiff
                  original={originalData}
                  tailored={tailored.structured_data}
                  changes={tailored.changes}
                />
              )}
              {atsScore && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Final ATS Score Breakdown
                  </p>
                  <MatchScore score={atsScore} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cover Letter Tab */}
        <TabsContent value="cover">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Cover Letter</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCover}
                  disabled={!currentDisplayCover}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateCoverLetter}
                  disabled={generatingCover}
                >
                  {generatingCover
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />
                  }
                  {coverText ? 'Regenerate' : 'Generate'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {generatingCover ? (
                <div className="min-h-[300px]">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {completion}
                    <span className="inline-block w-1 h-4 bg-brand-purple animate-pulse ml-0.5 align-middle" />
                  </p>
                </div>
              ) : currentDisplayCover ? (
                <Textarea
                  value={currentDisplayCover}
                  onChange={(e) => setCoverText(e.target.value)}
                  className="min-h-[300px] text-sm leading-relaxed"
                  placeholder="Your cover letter will appear here..."
                />
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-8 h-8 text-brand-purple mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Generate a personalized cover letter for this role
                  </p>
                  <Button onClick={handleGenerateCoverLetter}>
                    <Sparkles className="w-4 h-4" />Generate Cover Letter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
