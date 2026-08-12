'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ExternalLink, FileText, MapPin, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActivityPanel, type AddActivityEventInput } from '@/components/jobs/detail/ActivityPanel'
import { ApplicationAnswers } from '@/components/jobs/detail/ApplicationAnswers'
import {
  DocumentsWorkspace,
  type DocumentMode,
  type JobDetailTailoredVersion,
} from '@/components/jobs/detail/DocumentsWorkspace'
import { EmailInbox, type LogEmailInput } from '@/components/jobs/detail/EmailInbox'
import {
  JobFactsRail,
  JobSummaryDescription,
  JobSummaryOverview,
} from '@/components/jobs/detail/JobSummary'
import { QuestionsPanel } from '@/components/jobs/detail/QuestionsPanel'
import { buildActivityFeed } from '@/lib/applications/activity'
import { buildInboxThreads, emailThreadKey } from '@/lib/applications/email'
import { normalizeFormAnswers } from '@/lib/applications/form-answers'
import {
  APPLICATION_STATUSES,
  applicationStatusClasses,
  applicationStatusLabel,
  normalizeApplicationStatus,
} from '@/lib/jobs/status'
import { cn, scoreColor } from '@/lib/utils'
import type {
  ApplicationEmailLogEntry,
  ApplicationEvent,
  ApplicationStatus,
  ApplicationTrackerItem,
  ProfileData,
  TailorGapAnswer,
} from '@/types'

export type { JobDetailTailoredVersion } from '@/components/jobs/detail/DocumentsWorkspace'

type DetailTab =
  | 'overview'
  | 'description'
  | 'documents'
  | 'questions'
  | 'activity'
  | 'email'

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'description', label: 'Job description' },
  { id: 'documents', label: 'Documents' },
  { id: 'questions', label: 'Questions' },
  { id: 'activity', label: 'Activity' },
  { id: 'email', label: 'Email' },
]

interface JobDetailPageProps {
  item: ApplicationTrackerItem
  events: ApplicationEvent[]
  tailoredVersions: JobDetailTailoredVersion[]
  profileData: ProfileData
}

function resolveInitialTab(param: string | null): DetailTab {
  if (param && TABS.some(t => t.id === param)) return param as DetailTab
  return 'overview'
}

export function JobDetailPage({
  item,
  events,
  tailoredVersions,
  profileData: initialProfile,
}: JobDetailPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<DetailTab>(() => resolveInitialTab(searchParams.get('tab')))
  const [notes, setNotes] = useState(item.notes ?? '')
  const [emails, setEmails] = useState<ApplicationEmailLogEntry[]>(item.email_log ?? [])
  const formAnswers = useMemo(
    () => normalizeFormAnswers(item.form_answers),
    [item.form_answers]
  )
  const [localEvents, setLocalEvents] = useState(events)
  const [currentStatus, setCurrentStatus] = useState(normalizeApplicationStatus(item.status))
  const [currentScore, setCurrentScore] = useState(item.score)
  const [profileData, setProfileData] = useState(initialProfile)
  const [versions, setVersions] = useState(tailoredVersions)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    tailoredVersions[0]?.id ?? null
  )
  const [documentMode, setDocumentMode] = useState<DocumentMode>('list')
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const questions = useMemo(() => {
    const result: TailorGapAnswer[] = []
    const seen = new Set<string>()
    for (const version of versions) {
      for (const answer of version.gap_answers ?? []) {
        const question = answer.question?.replace(/\s+/g, ' ').trim() ?? ''
        const response = answer.answer?.replace(/\s+/g, ' ').trim() ?? ''
        if (!question && !response) continue
        const key = `${question.toLocaleLowerCase()}\u0000${response.toLocaleLowerCase()}`
        if (seen.has(key)) continue
        seen.add(key)
        result.push({ ...answer, question, answer: response })
      }
    }
    return result
  }, [versions])

  const suggestResumeId = useMemo(() => {
    for (const version of versions) {
      if ((version.gap_answers ?? []).some(a => a.answer?.trim())) return version.id
    }
    return versions[0]?.id ?? null
  }, [versions])

  const activityItems = useMemo(
    () => buildActivityFeed(localEvents, emails),
    [localEvents, emails]
  )
  const threads = useMemo(() => buildInboxThreads(emails), [emails])
  const canShowRail = !(tab === 'documents' && documentMode === 'edit')
  const showRail = canShowRail && railOpen
  const safeApplyUrl = safeHttpUrl(item.job.apply_url)

  async function patchApplication(patch: {
    notes?: string | null
    email_log?: ApplicationEmailLogEntry[]
  }) {
    setError(null)
    const response = await fetch(`/api/applications/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error || 'Failed to save application')
    }
  }

  async function handleStatusChange(next: ApplicationStatus) {
    const previous = currentStatus
    if (previous === next) return

    const optimistic: ApplicationEvent = {
      id: `local-${crypto.randomUUID()}`,
      application_id: item.id,
      user_id: item.user_id,
      event_type: 'status_change',
      from_status: previous,
      to_status: next,
      meta: { via: 'job_detail' },
      created_at: new Date().toISOString(),
    }
    setError(null)
    setCurrentStatus(next)
    setLocalEvents(current => [optimistic, ...current])

    try {
      const response = await fetch(`/api/applications/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, meta: { via: 'job_detail' } }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || 'Failed to update status')
      }
    } catch (cause) {
      setCurrentStatus(previous)
      setLocalEvents(current => current.filter(event => event.id !== optimistic.id))
      const message = cause instanceof Error ? cause.message : 'Failed to update status'
      setError(message)
      throw cause
    }
  }

  async function saveNotes(nextNotes: string) {
    await patchApplication({ notes: nextNotes })
    setNotes(nextNotes)
  }

  async function addEvent(input: AddActivityEventInput) {
    setError(null)
    const response = await fetch(`/api/applications/${item.id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'manual', ...input }),
    })
    const body = (await response.json().catch(() => ({}))) as {
      event?: ApplicationEvent
      error?: string
    }
    if (!response.ok || !body.event) {
      throw new Error(body.error || 'Failed to add event')
    }
    setLocalEvents(current => [body.event!, ...current])
  }

  async function logEmail(input: LogEmailInput) {
    const entry: ApplicationEmailLogEntry = {
      id: crypto.randomUUID(),
      subject: input.subject,
      body: input.body,
      direction: input.direction,
      sender: input.sender,
      recipients: input.recipients,
      at: new Date().toISOString(),
      source: 'manual',
      isRead: true,
    }
    const previous = emails
    const next = [entry, ...emails]
    setEmails(next)
    setSelectedThreadId(emailThreadKey(entry.subject))
    try {
      await patchApplication({ email_log: next })
    } catch (cause) {
      setEmails(previous)
      setSelectedThreadId(null)
      throw cause
    }
  }

  function openDocuments(mode: DocumentMode) {
    setDocumentMode(mode)
    setTab('documents')
  }

  function handleVersionSaved(result: {
    tailoredId: string
    structuredData: JobDetailTailoredVersion['structured_data']
    score: number | null
  }) {
    setVersions(current => {
      const existing = current.find(version => version.id === result.tailoredId)
      if (existing) {
        return current.map(version =>
          version.id === result.tailoredId
            ? {
                ...version,
                structured_data: result.structuredData,
                match_score: result.score,
              }
            : version
        )
      }
      const nextVersion = Math.max(0, ...current.map(version => version.version)) + 1
      return [
        {
          id: result.tailoredId,
          version: nextVersion,
          tailored_score: null,
          match_score: result.score,
          cover_letter: null,
          gap_answers: [],
          structured_data: result.structuredData,
          created_at: new Date().toISOString(),
        },
        ...current,
      ]
    })
    setSelectedDocId(result.tailoredId)
    setCurrentScore(result.score)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] dark:bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur dark:bg-card/95">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              href="/dashboard/tracker"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Back to applications"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                {item.job.title}
              </h1>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{item.job.company}</span>
                {item.job.location ? (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {item.job.location}
                  </span>
                ) : null}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
                    applicationStatusClasses(currentStatus)
                  )}
                >
                  {applicationStatusLabel(currentStatus)}
                </span>
                {currentScore != null ? (
                  <span className={cn('text-sm font-semibold tabular-nums', scoreColor(currentScore))}>
                    {currentScore}% match
                  </span>
                ) : null}
                {safeApplyUrl ? (
                  <a
                    href={safeApplyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View original
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openDocuments('edit')}>
              <FileText className="h-3.5 w-3.5" />
              {versions.length ? 'Edit resume' : 'Create resume'}
            </Button>
            {safeApplyUrl ? (
              <Button asChild size="sm">
                <a href={safeApplyUrl} target="_blank" rel="noreferrer">
                  Apply
                </a>
              </Button>
            ) : null}
            <div className="sm:hidden">
              <label htmlFor="mobile-application-status" className="sr-only">
                Application status
              </label>
              <select
                id="mobile-application-status"
                value={currentStatus}
                onChange={event =>
                  void handleStatusChange(event.target.value as ApplicationStatus).catch(
                    () => undefined
                  )
                }
                className="h-8 max-w-[154px] rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground"
              >
                {APPLICATION_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="hidden gap-1.5 overflow-x-auto px-4 pb-3 sm:flex md:px-6" role="radiogroup" aria-label="Application status">
          {APPLICATION_STATUSES.map(status => (
            <button
              key={status.value}
              type="button"
              role="radio"
              aria-checked={currentStatus === status.value}
              onClick={() => void handleStatusChange(status.value).catch(() => undefined)}
              className={cn(
                'whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                currentStatus === status.value
                  ? applicationStatusClasses(status.value)
                  : 'border-border text-muted-foreground hover:bg-secondary/50'
              )}
            >
              {status.label}
            </button>
          ))}
        </div>

        <div role="tablist" className="flex items-center gap-0.5 overflow-x-auto border-t border-border px-4 md:px-6">
          {TABS.map(itemTab => {
            const count =
              itemTab.id === 'questions'
                ? questions.length
                : itemTab.id === 'activity'
                  ? activityItems.length
                  : itemTab.id === 'email'
                    ? threads.length
                    : 0
            return (
              <button
                key={itemTab.id}
                type="button"
                role="tab"
                aria-selected={tab === itemTab.id}
                onClick={() => {
                  setTab(itemTab.id)
                  if (itemTab.id !== 'documents') setDocumentMode('list')
                }}
                className={cn(
                  'relative whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  tab === itemTab.id
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {itemTab.label}
                {count > 0 ? <span className="ml-1 text-xs text-muted-foreground">({count})</span> : null}
                {tab === itemTab.id ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />
                ) : null}
              </button>
            )
          })}
        </div>
      </header>

      {error ? (
        <p className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive md:px-6" role="alert">
          {error}
        </p>
      ) : null}

      <div
        className={cn(
          'gap-6 px-4 py-5 md:px-6',
          showRail ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]' : ''
        )}
      >
        <div className="min-w-0">
          {canShowRail && !railOpen ? (
            <div className="mb-3 hidden justify-end lg:flex">
              <Button type="button" size="sm" variant="outline" onClick={() => setRailOpen(true)}>
                <PanelRightOpen className="size-4" />
                Show job details
              </Button>
            </div>
          ) : null}
          {tab === 'overview' ? (
            <div className="space-y-4">
              <JobSummaryOverview
              score={currentScore}
                status={currentStatus}
                documentCount={versions.length}
                description={item.job.description}
                extracted={item.job.extracted_data}
                hasTailoredResume={versions.length > 0}
                onOpenDocuments={() => openDocuments(versions.length ? 'preview' : 'edit')}
                onOpenActivity={() => setTab('activity')}
                onOpenDescription={() => setTab('description')}
              />
              <JobFactsRail
                className="lg:hidden"
                defaultOpen={false}
                company={item.job.company}
                title={item.job.title}
                location={item.job.location}
                remoteType={item.job.remote_type}
                applyUrl={safeApplyUrl}
                extracted={item.job.extracted_data}
                activity={activityItems}
                onSeeAllActivity={() => setTab('activity')}
              />
            </div>
          ) : null}

          {tab === 'description' ? (
            <JobSummaryDescription
              description={item.job.description}
              extracted={item.job.extracted_data}
              applyUrl={safeApplyUrl}
            />
          ) : null}

          {tab === 'documents' ? (
            <DocumentsWorkspace
              jobId={item.job_id}
              profileData={profileData}
              onProfileData={patch => setProfileData(current => ({ ...current, ...patch }))}
              versions={versions}
              selectedId={selectedDocId}
              onSelectedId={setSelectedDocId}
              mode={documentMode}
              onMode={setDocumentMode}
              onVersionSaved={handleVersionSaved}
            />
          ) : null}

          {tab === 'questions' ? (
            <QuestionsPanel answers={questions} tailoredResumeId={suggestResumeId} />
          ) : null}

          {tab === 'activity' ? (
            <div className="space-y-5">
              <ActivityPanel
                items={activityItems}
                notes={notes}
                onSaveNotes={saveNotes}
                onAddEvent={addEvent}
              />
              <ApplicationAnswers
                applicationId={item.id}
                jobId={item.job_id}
                initialAnswers={formAnswers}
              />
            </div>
          ) : null}

          {tab === 'email' ? (
            <EmailInbox
              threads={threads}
              selectedThreadId={selectedThreadId}
              onSelectThread={setSelectedThreadId}
              onLogEmail={logEmail}
            />
          ) : null}
        </div>

        {showRail ? (
          <aside className="mt-5 hidden lg:mt-0 lg:block">
            <div className="sticky top-[176px]">
              <JobFactsRail
                company={item.job.company}
                title={item.job.title}
                location={item.job.location}
                remoteType={item.job.remote_type}
                applyUrl={safeApplyUrl}
                extracted={item.job.extracted_data}
                activity={activityItems}
                onSeeAllActivity={() => setTab('activity')}
                onCollapseRail={() => setRailOpen(false)}
              />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}

function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}
