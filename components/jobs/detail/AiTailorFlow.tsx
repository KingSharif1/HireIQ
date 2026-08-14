'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { generateQuestions, tailorResume, fetchTailorContext, APIError } from '@/lib/api/client'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { TailorProcessLog } from '@/components/tailor/TailorProcessLog'
import { mergeProcessLogs, type TailorProcessLogEntry } from '@/lib/tailor/process-log'
import {
  clearTailorSession,
  readTailorSession,
  shouldAutoStartTailor,
  writeTailorSession,
} from '@/lib/tailor/auto-start'
import type {
  ChangeDecision,
  GapAnalysis,
  GapQuestion,
  JobExtractedData,
  ResumeDiffChange,
  StructuredResume,
} from '@/types'
import { cn, scoreColor } from '@/lib/utils'

const CONNECT_STAGES = [
  { id: 'resume', label: 'Reading your resume' },
  { id: 'job', label: 'Pulling job requirements' },
  { id: 'gaps', label: 'Finding gaps & strengths' },
] as const

const GENERATE_STAGES = [
  { id: 'draft', label: 'Drafting tailored resume', detail: 'One Claude rewrite — no retry loop' },
  { id: 'score', label: 'Scoring match', detail: 'Local ATS score, not another AI call' },
] as const

const STOPPED_NO_RETRY = ' We stopped — we will not retry automatically.'

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
  const [connectDetail, setConnectDetail] = useState<string | undefined>()
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
  const [processLog, setProcessLog] = useState<TailorProcessLogEntry[]>([])
  const [logExpanded, setLogExpanded] = useState(true)
  const logStarted = useMemo(() => Date.now(), [])
  const startedRef = useRef(false)
  const inFlightRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const appendLog = useCallback(
    (label: string, detail?: string, status: TailorProcessLogEntry['status'] = 'ok') => {
      setProcessLog(prev => [
        ...prev,
        {
          id: `c${prev.length}`,
          at: new Date().toISOString(),
          label,
          detail,
          status,
          ms: Date.now() - logStarted,
        },
      ])
    },
    [logStarted]
  )

  const mergeServerLog = useCallback((entries?: TailorProcessLogEntry[]) => {
    if (!entries?.length) return
    setProcessLog(prev => mergeProcessLogs(prev.filter(e => !e.id.startsWith('s')), entries))
  }, [])

  const runQuickTailor = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    writeTailorSession(jobId, 'running')
    setPhase('generate')
    setGenerateIndex(0)
    setError(null)
    setProcessLog([])
    setLogExpanded(true)
    appendLog('Quick tailor', 'Loading resume + job from database (no AI yet)', 'pending')

    try {
      const ctx = await fetchTailorContext(jobId)
      mergeServerLog(ctx.processLog)
      setBaseResumeId(ctx.baseResumeId)
      appendLog(
        'Context ready',
        `${ctx.atsScore}% ATS baseline · one Claude rewrite (no critique loop)`,
      )

      const longWait = window.setTimeout(() => {
        appendLog('Still tailoring', 'Claude is rewriting your resume (~20–60s)', 'pending')
      }, 20_000)

      appendLog('Calling /api/tailor/generate', 'fastMode — 1 Claude call, no retry loop', 'pending')
      const result = await tailorResume({
        resumeId: ctx.baseResumeId,
        jobId,
        answers: {},
        fastMode: true,
      })

      window.clearTimeout(longWait)
      mergeServerLog(result.processLog)
      setGenerateIndex(GENERATE_STAGES.length - 1)
      appendLog(
        'Tailor complete',
        `Score ${result.matchScore}% → ${result.tailoredScore}% · ${result.changes.length} changes`,
      )

      setTailoredId(result.tailoredResumeId)
      setOriginal(result.originalData ?? result.tailoredData)
      setTailored(result.tailoredData)
      setChanges(result.changes)
      setDecisions(initialDecisions(result.changes))
      setMatchScore(result.matchScore)
      setTailoredScore(result.tailoredScore)

      onCompleteRef.current({
        tailoredId: result.tailoredResumeId,
        version: result.version ?? 1,
        structuredData: result.tailoredData,
        score: result.tailoredScore,
        matchScore: result.matchScore,
      })

      setPhase('review')
      writeTailorSession(jobId, 'done')
    } catch (err) {
      if (err instanceof APIError) {
        mergeServerLog(err.details?.processLog as TailorProcessLogEntry[] | undefined)
        appendLog('Tailoring failed', err.message, 'error')
        setError(err.message + STOPPED_NO_RETRY)
      } else {
        appendLog('Tailoring failed', 'Unknown error', 'error')
        setError('Tailoring failed.' + STOPPED_NO_RETRY)
      }
      setPhase('generate')
      setLogExpanded(true)
      clearTailorSession(jobId)
    } finally {
      inFlightRef.current = false
    }
  }, [appendLog, jobId, mergeServerLog])

  const loadQuestions = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setPhase('connect')
    setError(null)
    setConnectDetail(undefined)
    setConnectIndex(0)
    setProcessLog([])
    setLogExpanded(true)
    appendLog('Starting gap analysis', 'Loading resume, job, and GitHub context', 'pending')

    const resumeTimer = window.setTimeout(() => {
      setConnectIndex(1)
    }, 700)

    const longWaitTimer = window.setTimeout(() => {
      setConnectDetail('Reading your resume, GitHub projects, and job requirements — usually 15–30s.')
      appendLog('Still working', 'Claude is comparing your profile to the job (up to 55s)', 'pending')
    }, 12_000)

    try {
      appendLog('Calling /api/tailor/questions', undefined, 'pending')
      const result = await generateQuestions('', jobId)
      window.clearTimeout(resumeTimer)
      window.clearTimeout(longWaitTimer)
      mergeServerLog(result.processLog)
      setConnectIndex(2)
      setConnectDetail(undefined)
      setBaseResumeId(result.baseResumeId ?? null)
      setGapAnalysis(result.gapAnalysis ?? null)
      setQuestions(result.questions ?? [])
      appendLog(
        'Gap analysis ready',
        `${result.questions?.length ?? 0} question(s) · ${result.keySource === 'byok' ? 'your API key' : 'HireIQ key'}`,
      )
      await new Promise(r => window.setTimeout(r, 350))
      setPhase('questions')
    } catch (err) {
      window.clearTimeout(resumeTimer)
      window.clearTimeout(longWaitTimer)
      setConnectDetail(undefined)
      if (err instanceof APIError) {
        mergeServerLog(err.details?.processLog as TailorProcessLogEntry[] | undefined)
        appendLog('Gap analysis failed', err.message, 'error')
        setError(err.message + STOPPED_NO_RETRY)
      } else {
        appendLog('Gap analysis failed', 'Could not analyze gaps', 'error')
        setError('Could not analyze gaps.' + STOPPED_NO_RETRY)
      }
      setPhase('connect')
      setConnectIndex(0)
      setLogExpanded(true)
    } finally {
      inFlightRef.current = false
    }
  }, [appendLog, jobId, mergeServerLog])

  useEffect(() => {
    if (reviewOnly) return
    if (startedRef.current) return
    if (!shouldAutoStartTailor(readTailorSession(jobId))) return
    startedRef.current = true
    writeTailorSession(jobId, 'running')
    void runQuickTailor()
  }, [runQuickTailor, reviewOnly, jobId])

  async function runGenerate() {
    if (inFlightRef.current) return
    inFlightRef.current = true
    writeTailorSession(jobId, 'running')
    setPhase('generate')
    setGenerateIndex(0)
    setError(null)
    setLogExpanded(true)
    appendLog('Starting tailor generate', `${Object.keys(answers).length} answer(s) sent`, 'pending')
    let tick: number | undefined
    let longWait: number | undefined
    try {
      tick = window.setInterval(() => {
        setGenerateIndex(i => Math.min(i + 1, GENERATE_STAGES.length - 1))
      }, 4200)

      longWait = window.setTimeout(() => {
        appendLog('Still tailoring', 'One Claude rewrite can take up to a minute', 'pending')
      }, 25_000)

      appendLog('Calling /api/tailor/generate', undefined, 'pending')
      const result = await tailorResume({
        resumeId: baseResumeId ?? '',
        jobId,
        answers,
        questions: questions.map(q => ({ id: q.id, question: q.question })),
        gapAnalysis: gapAnalysis ?? undefined,
      })

      mergeServerLog(result.processLog)
      setGenerateIndex(GENERATE_STAGES.length - 1)

      appendLog(
        'Tailor complete',
        `Score ${result.matchScore}% → ${result.tailoredScore}% · ${result.changes.length} changes`,
      )

      setTailoredId(result.tailoredResumeId)
      setOriginal(result.originalData ?? result.tailoredData)
      setTailored(result.tailoredData)
      setChanges(result.changes)
      setDecisions(initialDecisions(result.changes))
      setMatchScore(result.matchScore)
      setTailoredScore(result.tailoredScore)

      // Notify parent so version appears in list while user reviews
      onCompleteRef.current({
        tailoredId: result.tailoredResumeId,
        version: result.version ?? 1,
        structuredData: result.tailoredData,
        score: result.tailoredScore,
        matchScore: result.matchScore,
      })

      setPhase('review')
      writeTailorSession(jobId, 'done')
    } catch (err) {
      if (err instanceof APIError) {
        mergeServerLog(err.details?.processLog as TailorProcessLogEntry[] | undefined)
        appendLog('Tailoring failed', err.message, 'error')
        setError(err.message + STOPPED_NO_RETRY)
      } else {
        appendLog('Tailoring failed', 'Unknown error', 'error')
        setError('Tailoring failed.' + STOPPED_NO_RETRY)
      }
      setPhase('questions')
      setLogExpanded(true)
      clearTailorSession(jobId)
    } finally {
      if (tick) window.clearInterval(tick)
      if (longWait) window.clearTimeout(longWait)
      inFlightRef.current = false
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
      onCompleteRef.current({
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
              <AiModelHint uses="strong" />
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
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void runQuickTailor()}>
              Run once more (uses credits)
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void loadQuestions()}>
              Try gap questions (slower)
            </Button>
          </div>
        </div>
      ) : null}

      <TailorProcessLog
        entries={processLog}
        expanded={logExpanded}
        onToggle={() => setLogExpanded(v => !v)}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        {phase === 'connect' ? (
          <AiFlowLoader
            title="Connecting your profile to this job"
            subtitle="We compare your resume and GitHub projects against what the role asks for."
            stages={CONNECT_STAGES.map((stage, i) =>
              i === connectIndex && connectDetail ? { ...stage, detail: connectDetail } : stage
            )}
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

        {phase === 'generate' && !error ? (
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
