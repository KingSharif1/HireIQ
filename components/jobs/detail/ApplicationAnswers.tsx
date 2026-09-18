'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ApplicationFormAnswer } from '@/types'

export interface ApplicationAnswersProps {
  applicationId: string
  jobId: string
  initialAnswers: ApplicationFormAnswer[]
}

function formatUpdatedAt(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ApplicationAnswers({
  applicationId,
  jobId: _jobId,
  initialAnswers,
}: ApplicationAnswersProps) {
  const [answers, setAnswers] = useState(initialAnswers)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function startEdit(entry: ApplicationFormAnswer) {
    setEditingKey(entry.key)
    setDraft(entry.answer)
    setError(null)
  }

  function cancelEdit() {
    setEditingKey(null)
    setDraft('')
    setError(null)
  }

  async function saveEdit(key: string) {
    setBusyKey(key)
    setError(null)
    try {
      const response = await fetch(`/api/applications/${applicationId}/answers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, answer: draft }),
      })
      const body = (await response.json().catch(() => ({}))) as {
        form_answers?: ApplicationFormAnswer[]
        error?: string
      }
      if (!response.ok) {
        throw new Error(body.error || 'Failed to save answer')
      }
      setAnswers(body.form_answers ?? [])
      setEditingKey(null)
      setDraft('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to save answer')
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteAnswer(key: string) {
    setBusyKey(key)
    setError(null)
    try {
      const response = await fetch(`/api/applications/${applicationId}/answers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const body = (await response.json().catch(() => ({}))) as {
        form_answers?: ApplicationFormAnswer[]
        error?: string
      }
      if (!response.ok) {
        throw new Error(body.error || 'Failed to delete answer')
      }
      setAnswers(body.form_answers ?? [])
      if (editingKey === key) cancelEdit()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to delete answer')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <section
      aria-labelledby="application-answers-title"
      className="rounded-xl border border-border bg-white p-4 text-foreground dark:bg-card sm:p-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="application-answers-title" className="text-lg font-semibold tracking-tight">
            Form answers
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            ATS form answers for this job only — they do not update your tailored resume.{' '}
            <Link href="/dashboard/profile?section=applyAnswers" className="underline underline-offset-2">
              Edit reusable answers on Profile
            </Link>
            .
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
          {answers.length} {answers.length === 1 ? 'answer' : 'answers'}
        </span>
      </header>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {answers.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-border bg-secondary/20 px-5 py-8 text-center">
          <p className="text-sm font-medium text-foreground">No form answers yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            ATS form answers you accept in the extension appear here for this job only. They do not
            change your tailored resume — set reusable defaults on{' '}
            <Link href="/dashboard/profile?section=applyAnswers" className="underline underline-offset-2">
              Profile
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {answers.map(entry => {
            const isEditing = editingKey === entry.key
            const isBusy = busyKey === entry.key
            const updatedLabel = formatUpdatedAt(entry.updatedAt)

            return (
              <li
                key={entry.key}
                title={updatedLabel ? `Updated ${updatedLabel}` : undefined}
                className="rounded-lg border border-border bg-secondary/10 px-3.5 py-3 sm:px-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{entry.question}</p>
                  </div>
                  {!isEditing ? (
                    <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity hover:opacity-100 focus-within:opacity-100">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        disabled={isBusy}
                        onClick={() => startEdit(entry)}
                        aria-label={`Edit answer for ${entry.question}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:text-destructive"
                        disabled={isBusy}
                        onClick={() => void deleteAnswer(entry.key)}
                        aria-label={`Delete answer for ${entry.question}`}
                      >
                        {isBusy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={draft}
                      onChange={event => setDraft(event.target.value)}
                      rows={3}
                      disabled={isBusy}
                      aria-label={`Answer for ${entry.question}`}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => void saveEdit(entry.key)}
                      >
                        {isBusy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={cancelEdit}
                      >
                        <X className="size-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {entry.answer?.trim() ? entry.answer : '—'}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
