'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiFlowLoader } from '@/components/ai/AiFlowLoader'
import { GapAnalysisSummary } from '@/components/tailor/GapAnalysisSummary'
import { QuestionFlow } from '@/components/tailor/QuestionFlow'
import { TailorDiff } from '@/components/tailor/TailorDiff'
import { MatchScore } from '@/components/tailor/MatchScore'
import { ResumePreview } from '@/components/resume/ResumePreview'
import { DEFAULT_RESUME_THEME } from '@/lib/export/theme'
import { buildApprovedResume, initialDecisions } from '@/lib/tailor/change-decisions'
import {
  APIError,
  continueTailorRun,
  fetchTailorRun,
  pollTailorRun,
  startTailorRun,
  type TailorRunDto,
  type TailorRunSnapshot,
} from '@/lib/api/client'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { TailorProcessLog } from '@/components/tailor/TailorProcessLog'
import type { TailorProcessLogEntry } from '@/lib/tailor/process-log'
import { isBusyTailorStatus } from '@/lib/tailor/run-types'
import { userFacingTailorError } from '@/lib/tailor/user-error'
import type {
  ChangeDecision,
  GapAnalysis,
  GapQuestion,
  JobExtractedData,
  ResumeDiffChange,
  StructuredResume,
} from '@/types'
import { cn, scoreColor } from '@/lib/utils'

const WAIT_HINTS = [
  'Matching your experience to this job',
  'Keeping it in your words',
  'Safe to leave — we’ll keep going',
] as const

type FlowPhase = 'connect' | 'questions' | 'generate' | 'review' | 'error'

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
  const [hintIndex, setHintIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<TailorRunDto['status'] | null>(null)

  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null)
  const [questions, setQuestions] = useState<GapQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const [tailoredId, setTailoredId] = useState<string | null>(reviewOnly?.tailoredId ?? null)
  const [original, setOriginal] = useState<StructuredResume | null>(reviewOnly?.original ?? null)
  const [tailored, setTailored] = useState<StructuredResume | null>(reviewOnly?.tailored ?? null)
  const [changes, setChanges] = useState<ResumeDiffChange[]>(reviewOnly?.changes ?? [])
  const [decisions, setDecisions] = useState<Record<string, ChangeDecision>>(
    reviewOnly?.decisions ?? {},
  )
  const [matchScore, setMatchScore] = useState<number | null>(reviewOnly?.matchScore ?? null)
  const [tailoredScore, setTailoredScore] = useState<number | null>(reviewOnly?.tailoredScore ?? null)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [processLog, setProcessLog] = useState<TailorProcessLogEntry[]>([])
  const [logExpanded, setLogExpanded] = useState(false)
  const startedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const applySnapshot = useCallback((snapshot: TailorRunSnapshot | null) => {
    if (!snapshot) return
    setTailoredId(snapshot.id)
    setOriginal(snapshot.original_structured_data ?? snapshot.structured_data)
    setTailored(snapshot.structured_data)
    setChanges(snapshot.changes ?? [])
    setDecisions(snapshot.change_decisions ?? initialDecisions(snapshot.changes ?? []))
    setMatchScore(snapshot.match_score)
    setTailoredScore(snapshot.tailored_score)
    onCompleteRef.current({
      tailoredId: snapshot.id,
      version: snapshot.version,
      structuredData: snapshot.structured_data,
      score: snapshot.tailored_score,
      matchScore: snapshot.match_score,
    })
  }, [])

  const applyRun = useCallback(
    (run: TailorRunDto, snapshot: TailorRunSnapshot | null) => {
      setRunId(run.id)
      setRunStatus(run.status)
      setProcessLog(run.process_log ?? [])
      setGapAnalysis(run.gap_analysis ?? null)
      setQuestions(run.questions ?? [])
      setAnswers(run.answers ?? {})
      setError(run.status === 'failed' ? run.error : null)
      if (run.status === 'awaiting_answers') setPhase('questions')
      else if (run.status === 'generating') setPhase('generate')
      else if (run.status === 'needs_review') {
        applySnapshot(snapshot)
        setPhase('review')
      } else if (run.status === 'failed') {
        setPhase('error')
        setLogExpanded(true)
      } else setPhase('connect')
    },
    [applySnapshot],
  )

  const attachOrStart = useCallback(async () => {
    try {
      const existing = await fetchTailorRun(jobId)
      if (existing.run && existing.run.status !== 'cancelled') {
        applyRun(existing.run, existing.tailored)
        return
      }
      const started = await startTailorRun(jobId)
      applyRun(started.run, started.tailored)
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Could not start tailor')
      setPhase('error')
      setLogExpanded(true)
    }
  }, [applyRun, jobId])

  useEffect(() => {
    if (reviewOnly) return
    if (startedRef.current) return
    startedRef.current = true
    void attachOrStart()
  }, [attachOrStart, reviewOnly])

  useEffect(() => {
    if (!runId) return
    if (!isBusyTailorStatus(runStatus ?? '')) return
    const tick = window.setInterval(() => {
      void pollTailorRun(runId)
        .then(({ run, tailored: snapshot }) => applyRun(run, snapshot))
        .catch(() => undefined)
    }, 2000)
    return () => window.clearInterval(tick)
  }, [applyRun, runId, runStatus])

  useEffect(() => {
    if (phase !== 'connect' && phase !== 'generate') return
    const id = window.setInterval(() => {
      setHintIndex(i => (i + 1) % WAIT_HINTS.length)
    }, 3500)
    return () => window.clearInterval(id)
  }, [phase])

  async function submitAnswers() {
    if (!runId) return
    setPhase('generate')
    setRunStatus('generating')
    try {
      const result = await continueTailorRun(runId, answers)
      applyRun(result.run, null)
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Could not continue tailor')
      setPhase('error')
      setLogExpanded(true)
    }
  }

  async function retryTailor() {
    setError(null)
    setLogExpanded(false)
    setHintIndex(0)
    setPhase('connect')
    setRunStatus('analyzing_gaps')
    try {
      const started = await startTailorRun(jobId)
      applyRun(started.run, started.tailored)
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Could not start tailor')
      setPhase('error')
      setLogExpanded(true)
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

  const busy = isBusyTailorStatus(runStatus ?? '')
  const facing = userFacingTailorError(error)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background pb-20 md:pb-0 md:left-[68px]">
      <header className="flex-shrink-0 border-b border-border px-3 py-2.5 md:px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground">
              {phase === 'review' ? 'Review this version' : 'Tailor resume'}
            </h1>
            {busy ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Safe to leave — we’ll keep going.
              </p>
            ) : null}
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

      {error && phase !== 'error' ? (
        <div className="mx-4 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {facing.message}
        </div>
      ) : null}

      {phase === 'error' && processLog.length > 0 ? (
        <TailorProcessLog
          entries={processLog}
          expanded={logExpanded}
          onToggle={() => setLogExpanded(v => !v)}
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        {phase === 'connect' ? (
          <AiFlowLoader
            title="Reviewing this job"
            subtitle={WAIT_HINTS[hintIndex]}
          />
        ) : null}

        {phase === 'error' ? (
          <AiFlowLoader
            title={facing.title}
            error={facing}
            actionLabel={facing.canRetry ? 'Try again' : undefined}
            onAction={facing.canRetry ? () => void retryTailor() : undefined}
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
                onComplete={() => void submitAnswers()}
              />
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">Looks good — we can write this version now.</p>
                <Button type="button" onClick={() => void submitAnswers()}>
                  Write this version
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {phase === 'generate' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {processLog.length > 0 ? (
              <TailorProcessLog
                entries={processLog}
                expanded={logExpanded}
                onToggle={() => setLogExpanded(v => !v)}
              />
            ) : null}
            <AiFlowLoader
              title="Writing a version in your voice"
              subtitle={
                processLog.find(e => e.status === 'pending')?.detail || WAIT_HINTS[hintIndex]
              }
            />
          </div>
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
