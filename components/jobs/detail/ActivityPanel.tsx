'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { Check, CircleAlert, Clock3, Plus, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PortalLoginSection } from '@/components/jobs/detail/JobSummary'
import type { ActivityItem } from '@/lib/applications/activity'

export type AddActivityEventInput = {
  title: string
  detail?: string
}

export type ActivityPanelProps = {
  items: readonly ActivityItem[]
  notes: string
  onSaveNotes: (notes: string) => void | Promise<void>
  onAddEvent: (event: AddActivityEventInput) => void | Promise<void>
  portalEmail?: string | null
  portalPassword?: string | null
  portalNote?: string | null
  disabled?: boolean
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const itemStyles: Record<ActivityItem['kind'], string> = {
  status: 'border-brand-green/40 bg-brand-green/10 text-brand-green',
  email: 'border-primary/40 bg-primary/10 text-primary',
  created: 'border-border bg-secondary text-foreground',
  note: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  other: 'border-border bg-muted text-muted-foreground',
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ActivityPanel({
  items,
  notes,
  onSaveNotes,
  onAddEvent,
  portalEmail,
  portalPassword,
  portalNote,
  disabled = false,
}: ActivityPanelProps) {
  const [notesDraft, setNotesDraft] = useState({ source: notes, value: notes })
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [eventTitle, setEventTitle] = useState('')
  const [eventDetail, setEventDetail] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [eventError, setEventError] = useState<string | null>(null)

  const chronologicalItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftTime = new Date(left.at).getTime()
        const rightTime = new Date(right.at).getTime()
        if (Number.isNaN(leftTime)) return 1
        if (Number.isNaN(rightTime)) return -1
        return rightTime - leftTime
      }),
    [items]
  )

  const notesValue = notesDraft.source === notes ? notesDraft.value : notes
  const notesChanged = notesValue !== notes

  async function handleSaveNotes() {
    setSaveState('saving')
    try {
      await onSaveNotes(notesValue)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  async function handleAddEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = eventTitle.trim()
    if (!title) return

    setIsAdding(true)
    setEventError(null)
    try {
      await onAddEvent({
        title,
        detail: eventDetail.trim() || undefined,
      })
      setEventTitle('')
      setEventDetail('')
    } catch {
      setEventError('The event could not be added. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="activity-panel-title">
      <header>
        <h2 id="activity-panel-title" className="text-lg font-semibold text-foreground">
          Activity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep private notes and a complete history of this application.
        </p>
      </header>

      <PortalLoginSection
        email={portalEmail}
        password={portalPassword}
        note={portalNote}
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm p-4"
      />

      <div className="rounded-xl border border-border bg-white p-4 dark:bg-card sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="application-notes" className="text-sm font-semibold text-foreground">
            Application notes
          </label>
          <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {saveState === 'saving' ? 'Saving…' : null}
            {saveState === 'saved' ? (
              <span className="inline-flex items-center gap-1 text-brand-green">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Saved
              </span>
            ) : null}
            {saveState === 'error' ? (
              <span className="inline-flex items-center gap-1 text-destructive">
                <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                Save failed
              </span>
            ) : null}
          </span>
        </div>
        <Textarea
          id="application-notes"
          className="mt-3 min-h-28"
          placeholder="Add interview details, follow-up reminders, or other private notes…"
          value={notesValue}
          disabled={disabled || saveState === 'saving'}
          onChange={event => {
            setNotesDraft({ source: notes, value: event.target.value })
            setSaveState('idle')
          }}
        />
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSaveNotes}
            disabled={disabled || !notesChanged || saveState === 'saving'}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saveState === 'saving' ? 'Saving' : 'Save notes'}
          </Button>
        </div>
      </div>

      <form
        className="space-y-3 rounded-xl border border-border bg-white p-4 dark:bg-card sm:p-5"
        onSubmit={handleAddEvent}
      >
        <div>
          <h3 className="text-sm font-semibold text-foreground">Add event</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Log an interview, follow-up, or other application milestone.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-end">
          <div>
            <label htmlFor="activity-event-title" className="mb-1.5 block text-xs font-medium">
              Title
            </label>
            <Input
              id="activity-event-title"
              placeholder="Phone screen"
              value={eventTitle}
              disabled={disabled || isAdding}
              onChange={event => setEventTitle(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="activity-event-detail" className="mb-1.5 block text-xs font-medium">
              Detail <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="activity-event-detail"
              placeholder="Spoke with the hiring manager"
              value={eventDetail}
              disabled={disabled || isAdding}
              onChange={event => setEventDetail(event.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="sm:mb-1"
            disabled={disabled || isAdding || !eventTitle.trim()}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {isAdding ? 'Adding' : 'Add event'}
          </Button>
        </div>
        {eventError ? (
          <p className="text-xs text-destructive" role="alert">
            {eventError}
          </p>
        ) : null}
      </form>

      <div className="rounded-xl border border-border bg-white p-4 dark:bg-card sm:p-5">
        <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
        {chronologicalItems.length === 0 ? (
          <div className="py-10 text-center">
            <Clock3 className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">No activity yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Status changes and events will appear here.
            </p>
          </div>
        ) : (
          <ol className="relative mt-5 space-y-5 border-l border-border" aria-label="Application activity, newest first">
            {chronologicalItems.map(item => (
              <li key={item.id} className="relative pl-6">
                <span
                  className={`absolute -left-2 top-0.5 flex h-4 w-4 rounded-full border ${itemStyles[item.kind]}`}
                  aria-hidden="true"
                />
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <time
                    dateTime={item.at}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {formatDateTime(item.at)}
                  </time>
                </div>
                {item.detail ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {item.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
