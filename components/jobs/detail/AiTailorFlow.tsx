'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiFlowLoader } from '@/components/ai/AiFlowLoader'
import { AiModelHint } from '@/components/ai/AiModelHint'
import { GapAnalysisSummary } from '@/components/tailor/GapAnalysisSummary'
import { QuestionFlow } from '@/components/tailor/QuestionFlow'
import { TailorDiff } from '@/components/tailor/TailorDiff'
import { MatchScore } from '@/components/tailor/MatchScore'
import { ResumePreview } from '@/components/resume/ResumePreview'
import { DEFAULT_RESUME_THEME } from '@/lib/export/theme'
import { buildApprovedResume, initialDecisions } from '@/lib/tailor/change-decisions'
import { generateQuestions, tailorResume, APIError } from '@/lib/api/client'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { cn, scoreColor } from '@/lib/utils'
import type {
  ChangeDecision,
  GapAnalysis,
  GapQuestion,
  JobExtractedData,
  ResumeDiffChange,
  StructuredResume,
} from '@/types'

const CONNECT_STAGES = [
  { id: 'resume', label: 'Reading your resume' },
  { id: 'job', label: 'Pulling job requirements' },
  { id: 'gaps', label: 'Finding gaps & strengths' },
] as const

const GENERATE_STAGES = [
  { id: 'draft', label: 'Drafting tailored resume', detail: 'Matching keywords to your experience' },
  { id: 'critique', label: 'Critiquing & refining', detail: 'Checking claims stay honest' },
  { id: 'score', label: 'Scoring match', detail: 'Calculating ATS fit' },
] as const

type FlowPhase = 'connect' | 'questions' | 'generate' | 'review'

export type AiTailorCompletePayload = {
  tailoredId: string
  version: number
  structuredData: StructuredResume
  score: number | null
  matchScore: number | null
}

type AiTailorFlowProps = {
  jobId: string
  jobExtracted: JobExtractedData | null
  /** When set, re-open review for an existing AI-generated version */
  reviewOnly?: {
    tailoredId: string
    original: StructuredResume
    tailored: StructuredResume
    changes: ResumeDiffChange[]
    decisions: Record<string, ChangeDecision>
    matchScore: number | null
    tailoredScore: number | null
  }
  onDone: () => void
  onComplete: (payload: AiTailorCompletePayload) => void
}

export function AiTailorFlow({
  jobId,
  jobExtracted,
  reviewOnly,
  onDone,
  onComplete,
}: AiTailorFlowProps) {
  const [phase, setPhase] = useState<FlowPhase>(reviewOnly ? 'review' : 'connect')
  const [connectIndex, setConnectIndex] = useState(0)
  const [generateIndex, setGenerateIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [baseResumeId, setBaseResumeId] = useState<string | null>(null)
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null)
  const [questions, setQuestions] = useState<GapQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const [tailoredId, setTailoredId] = useState<string | null>(reviewOnly?.tailoredId ?? null)
  const [original, setOriginal] = useState<StructuredResume | null>(reviewOnly?.original ?? null)
  const [tailored, setTailored] = useState<StructuredResume | null>(reviewOnly?.tailored ?? null)
  const [changes, setChanges] = useState<ResumeDiffChange[]>(reviewOnly?.changes ?? [])
  const [decisions, setDecisions] = useState<Record<string, ChangeDecision>>(
    reviewOnly?.decisions ?? {}
  )
  const [matchScore, setMatchScore] = useState<number | null>(reviewOnly?.matchScore ?? null)
  const [tailoredScore, setTailoredScore] = useState<number | null>(reviewOnly?.tailoredScore ?? null)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const loadQuestions = useCallback(async () => {
    setError(null)
    setConnectIndex(0)
    try {
      setConnectIndex(1)
      const result = await generateQuestions('', jobId)
      setConnectIndex(2)
      setBaseResumeId(result.baseResumeId ?? null)
      setGapAnalysis(result.gapAnalysis ?? null)
      setQuestions(result.questions ?? [])
      setPhase('questions')
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Could not analyze gaps')
      setPhase('connect')
    }
  }, [jobId])

  useEffect(() => {
    if (reviewOnly) return
    void loadQuestions()
  }, [loadQuestions, reviewOnly])

  async function runGenerate() {
    setPhase('generate')
    setGenerateIndex(0)
    setError(null)
    try {
      const tick = window.setInterval(() => {
        setGenerateIndex(i => Math.min(i + 1, GENERATE_STAGES.length - 1))
      }, 4200)

      const result = await tailorResume({
        resumeId: baseResumeId ?? '',
        jobId,
        answers,
        questions: questions.map(q => ({ id: q.id, question: q.question })),
        gapAnalysis: gapAnalysis ?? undefined,
      })

      window.clearInterval(tick)
      setGenerateIndex(GENERATE_STAGES.length - 1)

      setTailoredId(result.tailoredResumeId)
      setOriginal(result.originalData ?? result.tailoredData)
      setTailored(result.tailoredData)
      setChanges(result.changes)
      setDecisions(initialDecisions(result.changes))
      setMatchScore(result.matchScore)
      setTailoredScore(result.tailoredScore)

      // Notify parent so version appears in list while user reviews
      onComplete({
        tailoredId: result.tailoredResumeId,
        version: result.version ?? 1,
        structuredData: result.tailoredData,
        score: result.tailoredScore,
        matchScore: result.matchScore,
      })

      setPhase('review')
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Tailoring failed')
      setPhase('questions')
    }
  }

  const approvedPreview = useMemo(() => {
    if (!original || !tailored) return null
    return buildApprovedResume(original, tailored, changes, decisions)
  }, [original, tailored, changes, decisions])

  const liveScore = useMemo(() => {
    if (!approvedPreview || !jobExtracted) return null
    return calculateATSScore(approvedPreview, jobExtracted)
  }, [approvedPreview, jobExtracted])

  async function saveReview() {
    if (!tailoredId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/tailor/${tailoredId}/decisions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_decisions: decisions }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || 'Could not save review')
      }

      const scoreRes = await fetch(`/api/tailor/${tailoredId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_decisions: decisions, persist: true }),
      })
      const scoreBody = (await scoreRes.json()) as { score?: { total: number }; error?: string }
      if (!scoreRes.ok) throw new Error(scoreBody.error || 'Could not update score')

      const finalScore = scoreBody.score?.total ?? tailoredScore
      onComplete({
        tailoredId,
        version: 0,
        structuredData: approvedPreview ?? tailored!,
        score: finalScore ?? null,
        matchScore,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background pb-20 md:pb-0 md:left-[68px]">
      <header className="flex-shrink-0 border-b border-border px-3 py-2.5 md:px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground">
              {phase === 'review' ? 'Review AI changes' : 'AI resume tailor'}
            </h1>
            <div className="mt-0.5">
              <AiModelHint uses="strong+fast" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {liveScore ? (
              <span className={cn('text-sm font-bold tabular-nums', scoreColor(liveScore.total))}>
                {liveScore.total}%
              </span>
            ) : tailoredScore != null ? (
              <span className={cn('text-sm font-bold tabular-nums', scoreColor(tailoredScore))}>
                {tailoredScore}%
              </span>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              {phase === 'review' ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {error ? (
        <div className="mx-4 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
          {phase === 'connect' ? (
            <Button type="button" size="sm" variant="outline" className="ml-2" onClick={() => void loadQuestions()}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        {phase === 'connect' ? (
          <AiFlowLoader
            title="Connecting your profile to this job"
            subtitle="We compare your resume against what the role asks for."
            stages={[...CONNECT_STAGES]}
            activeIndex={connectIndex}
          />
        ) : null}

        {phase === 'questions' ? (
          <div className="mx-auto max-w-xl space-y-6 p-4 md:p-6">
            {gapAnalysis ? <GapAnalysisSummary analysis={gapAnalysis} /> : null}
            {questions.length > 0 ? (
              <QuestionFlow
                questions={questions}
                answers={answers}
                onAnswer={(id, val) => setAnswers(prev => ({ ...prev, [id]: val }))}
                onComplete={() => void runGenerate()}
              />
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">No extra questions — ready to tailor.</p>
                <Button type="button" onClick={() => void runGenerate()}>
                  Tailor my resume
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {phase === 'generate' ? (
          <AiFlowLoader
            title="Tailoring your resume"
            subtitle="This usually takes 20–40 seconds."
            stages={[...GENERATE_STAGES]}
            activeIndex={generateIndex}
          />
        ) : null}

        {phase === 'review' && original && tailored ? (
          <div className="flex min-h-0 flex-col lg:flex-row">
            <div className="min-w-0 flex-1 space-y-4 p-4 md:p-6 lg:max-w-[52%]">
              {liveScore ? (
                <div className="rounded-xl border border-border bg-card p-4">
                  <MatchScore score={liveScore} compact />
                </div>
              ) : null}
              <TailorDiff
                original={original}
                tailored={tailored}
                changes={changes}
                decisions={decisions}
                onDecisionsChange={setDecisions}
                onSave={() => saveReview()}
                saving={saving}
              />
            </div>
            <div className="hidden min-h-[320px] flex-1 border-t border-border bg-neutral-100/80 dark:bg-secondary/20 lg:block lg:border-l lg:border-t-0">
              <ResumePreview
                data={approvedPreview ?? tailored}
                theme={DEFAULT_RESUME_THEME}
                showHealth={false}
                className="h-full min-h-[480px] p-4"
              />
            </div>
            {/* Mobile preview toggle */}
            <div className="border-t border-border p-3 lg:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowPreview(v => !v)}
              >
                {showPreview ? 'Hide preview' : 'Preview resume'}
              </Button>
              {showPreview && approvedPreview ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-border">
                  <ResumePreview
                    data={approvedPreview}
                    theme={DEFAULT_RESUME_THEME}
                    showHealth={false}
                    className="min-h-[360px] p-2"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
