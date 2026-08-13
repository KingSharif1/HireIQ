'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { TailorGapAnswer } from '@/types'

const COLLAPSIBLE_ANSWER_LENGTH = 280

export interface QuestionsPanelProps {
  answers: TailorGapAnswer[]
  /** Latest tailored resume that owns these gap answers — enables Suggest for master. */
  tailoredResumeId?: string | null
}

export function QuestionsPanel({ answers, tailoredResumeId }: QuestionsPanelProps) {
  const uniqueAnswers = deduplicateAnswers(answers)
  const answerCount = uniqueAnswers.length
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function suggestForMaster() {
    if (!tailoredResumeId) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/profile/suggestions/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailoredResumeId }),
      })
      const json = (await res.json()) as {
        error?: string
        queued?: number
        message?: string
        profilePath?: string
      }
      if (!res.ok) throw new Error(json.error || 'Failed to suggest')
      if (!json.queued) {
        setMessage(json.message || 'Nothing new to suggest')
      } else {
        setMessage(
          `${json.queued} update${json.queued === 1 ? '' : 's'} queued on Profile — accept or deny there.`
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suggest')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-labelledby="questions-panel-title"
      className="rounded-xl border border-border bg-white p-4 text-foreground shadow-sm dark:bg-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="questions-panel-title" className="text-lg font-semibold tracking-tight">
            Questions
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Answers saved while tailoring. Suggest durable facts to your master profile when you want.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
            {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
          </span>
          {answerCount > 0 && tailoredResumeId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void suggestForMaster()}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Suggest for master
            </Button>
          ) : null}
        </div>
      </header>

      {message ? (
        <p className="mt-3 text-sm text-foreground">
          {message}{' '}
          <Link href="/dashboard/profile?section=experience" className="underline underline-offset-2">
            Open Profile
          </Link>
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {answerCount === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/20 px-5 py-7 text-center">
          <p className="text-sm font-medium text-foreground">No saved questions yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Questions and answers will appear here after you tailor a resume for this job.
          </p>
        </div>
      ) : (
        <ol className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {uniqueAnswers.map((item, index) => (
            <li
              key={item.key}
              className="bg-background/40 px-3.5 py-3 dark:bg-background/20 sm:px-4"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-[11px] font-semibold tabular-nums text-muted-foreground"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    {item.question || 'Question not recorded'}
                  </p>
                  <div className="mt-2 border-l-2 border-border pl-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Answer
                    </p>
                    <AnswerText answer={item.answer} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function AnswerText({ answer }: { answer: string }) {
  if (!answer) {
    return <p className="text-sm italic text-muted-foreground">No answer was saved.</p>
  }

  if (answer.length <= COLLAPSIBLE_ANSWER_LENGTH) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{answer}</p>
    )
  }

  return (
    <details className="group">
      <summary className="cursor-pointer list-none rounded-sm text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
        <span className="line-clamp-3 whitespace-pre-wrap leading-relaxed group-open:hidden">
          {answer}
        </span>
        <span className="mt-1.5 inline-block text-xs font-semibold text-foreground underline-offset-2 group-hover:underline">
          <span className="group-open:hidden">Show full answer</span>
          <span className="hidden group-open:inline">Hide full answer</span>
        </span>
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {answer}
      </p>
    </details>
  )
}

function deduplicateAnswers(
  answers: TailorGapAnswer[]
): Array<TailorGapAnswer & { key: string }> {
  const seen = new Set<string>()
  const unique: Array<TailorGapAnswer & { key: string }> = []

  for (const item of answers) {
    const question = item.question?.trim() ?? ''
    const answer = item.answer?.trim() ?? ''
    if (!question && !answer) continue

    const key = `${normalizeForComparison(question)}\u0000${normalizeForComparison(answer)}`
    if (seen.has(key)) continue

    seen.add(key)
    unique.push({ ...item, question, answer, key })
  }

  return unique
}

function normalizeForComparison(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}
