'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronDown, CircleAlert, Mail, Plus, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { InboxThread } from '@/lib/applications/email'

export type LogEmailInput = {
  subject: string
  body: string
  direction: 'sent' | 'received'
  sender: string
  recipients: string[]
}

export type ReplyEmailInput = {
  body: string
  to?: string
  subject?: string
  inReplyToId?: string
}

export type EmailInboxProps = {
  threads: readonly InboxThread[]
  selectedThreadId?: string | null
  onSelectThread: (threadId: string) => void
  onLogEmail: (email: LogEmailInput) => void | Promise<void>
  /** When set, show Reply composer that sends via HireIQ masked address. */
  onReplyEmail?: (email: ReplyEmailInput) => void | Promise<void>
  disabled?: boolean
  /** When set, remind the user to apply with this HireIQ address. */
  applyEmail?: string | null
  applicationId?: string | null
}

const directionStyles = {
  sent: 'border-primary/30 bg-primary/10 text-primary',
  received: 'border-brand-green/30 bg-brand-green/10 text-brand-green',
  note: 'border-border bg-secondary text-muted-foreground',
} as const

const sourceLabels = {
  manual: 'Manual',
  gmail: 'Gmail',
  forwarded: 'Forwarded',
  masked: 'HireIQ',
} as const

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

function parseRecipients(value: string): string[] {
  return value
    .split(',')
    .map(recipient => recipient.trim())
    .filter(Boolean)
}

export function EmailInbox({
  threads,
  selectedThreadId,
  onSelectThread,
  onLogEmail,
  onReplyEmail,
  disabled = false,
  applyEmail = null,
}: EmailInboxProps) {
  const selectedThread = useMemo(
    () => threads.find(thread => thread.id === selectedThreadId) ?? threads[0] ?? null,
    [selectedThreadId, threads]
  )
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [direction, setDirection] = useState<LogEmailInput['direction']>('received')
  const [sender, setSender] = useState('')
  const [recipients, setRecipients] = useState('')
  const [isLogging, setIsLogging] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [replyOk, setReplyOk] = useState<string | null>(null)

  const lastReceived = useMemo(() => {
    if (!selectedThread) return null
    return [...selectedThread.messages].reverse().find(m => m.direction === 'received') ?? null
  }, [selectedThread])

  const canReply = Boolean(onReplyEmail && applyEmail && lastReceived)

  useEffect(() => {
    setReplyBody('')
    setReplyError(null)
    setReplyOk(null)
  }, [selectedThread?.id])

  async function handleLogEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedRecipients = parseRecipients(recipients)
    if (!subject.trim() || !body.trim() || !sender.trim() || parsedRecipients.length === 0) return

    setIsLogging(true)
    setFormError(null)
    try {
      await onLogEmail({
        subject: subject.trim(),
        body: body.trim(),
        direction,
        sender: sender.trim(),
        recipients: parsedRecipients,
      })
      setSubject('')
      setBody('')
      setSender('')
      setRecipients('')
    } catch {
      setFormError('The email could not be logged. Please try again.')
    } finally {
      setIsLogging(false)
    }
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onReplyEmail || !lastReceived || !replyBody.trim()) return
    setIsReplying(true)
    setReplyError(null)
    setReplyOk(null)
    try {
      await onReplyEmail({
        body: replyBody.trim(),
        to: lastReceived.sender,
        subject: lastReceived.subject,
        inReplyToId: lastReceived.id,
      })
      setReplyBody('')
      setReplyOk('Sent via your HireIQ application email.')
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Could not send reply.')
    } finally {
      setIsReplying(false)
    }
  }

  const formDisabled = disabled || isLogging
  const replyDisabled = disabled || isReplying

  return (
    <section className="space-y-5" aria-labelledby="email-inbox-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="email-inbox-title" className="text-lg font-semibold text-foreground">
            Email
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review linked messages or manually log application emails.
          </p>
          {applyEmail ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Apply with{' '}
              <span className="font-mono text-foreground">{applyEmail}</span>
              {' — '}
              employer replies show up here when we can match the company.
            </p>
          ) : null}
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {threads.length} {threads.length === 1 ? 'thread' : 'threads'}
        </span>
      </header>

      {threads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-5 py-12 text-center dark:bg-card">
          <Mail className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-foreground">No emails logged</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
            {applyEmail
              ? `Use ${applyEmail} on the employer form. Replies land here when we can match the company.`
              : 'Emails linked to this application will appear here. You can also record a real message with the manual form below.'}
          </p>
        </div>
      ) : (
        <div className="grid overflow-hidden rounded-xl border border-border bg-white dark:bg-card lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.7fr)]">
          <nav className="border-b border-border lg:border-b-0 lg:border-r" aria-label="Email threads">
            <ul className="max-h-80 overflow-y-auto lg:max-h-[38rem]">
              {threads.map(thread => {
                const isSelected = thread.id === selectedThread?.id
                return (
                  <li key={thread.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      className={`w-full px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                        isSelected
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      }`}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => onSelectThread(thread.id)}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className={`truncate text-sm ${thread.unread ? 'font-semibold' : 'font-medium'}`}>
                          {thread.subject}
                        </span>
                        {thread.unread ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                        ) : null}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5">
                        {thread.preview || 'No message preview'}
                      </span>
                      <span className="mt-1.5 block text-[11px]">
                        {formatDateTime(thread.latestAt)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {selectedThread ? (
            <div className="min-w-0">
              <div className="border-b border-border px-4 py-4 sm:px-5">
                <h3 className="break-words text-base font-semibold text-foreground">
                  {selectedThread.subject}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedThread.messages.length}{' '}
                  {selectedThread.messages.length === 1 ? 'message' : 'messages'}
                </p>
              </div>
              <ol className="max-h-[32rem] space-y-4 overflow-y-auto p-4 sm:p-5" aria-label={`${selectedThread.subject} messages`}>
                {selectedThread.messages.map(message => {
                  const DirectionIcon =
                    message.direction === 'sent' ? ArrowUpRight : ArrowDownLeft
                  return (
                    <li key={message.id} className="rounded-lg border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${directionStyles[message.direction]}`}
                        >
                          <DirectionIcon className="h-3 w-3" aria-hidden="true" />
                          {message.direction}
                        </span>
                        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {sourceLabels[message.source]}
                        </span>
                        <time
                          dateTime={message.at}
                          className="ml-auto text-[11px] text-muted-foreground"
                        >
                          {formatDateTime(message.at)}
                        </time>
                      </div>
                      <dl className="mt-3 grid gap-1 text-xs sm:grid-cols-[4rem_minmax(0,1fr)]">
                        <dt className="font-medium text-muted-foreground">From</dt>
                        <dd className="break-words text-foreground">
                          {message.sender || 'Not recorded'}
                        </dd>
                        <dt className="font-medium text-muted-foreground">To</dt>
                        <dd className="break-words text-foreground">
                          {message.recipients?.join(', ') || 'Not recorded'}
                        </dd>
                        {message.cc?.length ? (
                          <>
                            <dt className="font-medium text-muted-foreground">Cc</dt>
                            <dd className="break-words text-foreground">{message.cc.join(', ')}</dd>
                          </>
                        ) : null}
                      </dl>
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                          {message.body || 'No message body recorded.'}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>

              {canReply && lastReceived ? (
                <form
                  className="space-y-3 border-t border-border p-4 sm:p-5"
                  onSubmit={handleReply}
                >
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Reply via HireIQ</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sends from{' '}
                      <span className="font-mono text-foreground">{applyEmail}</span>
                      {' '}to {lastReceived.sender || 'the employer'}. They see your HireIQ address — not your personal inbox.
                    </p>
                  </div>
                  <Textarea
                    className="min-h-28"
                    placeholder="Write your reply…"
                    value={replyBody}
                    disabled={replyDisabled}
                    onChange={event => {
                      setReplyBody(event.target.value)
                      setReplyOk(null)
                    }}
                    required
                  />
                  {replyError ? (
                    <p className="inline-flex items-center gap-1.5 text-xs text-destructive" role="alert">
                      <CircleAlert className="h-4 w-4" aria-hidden="true" />
                      {replyError}
                    </p>
                  ) : null}
                  {replyOk ? (
                    <p className="text-xs text-muted-foreground" role="status">
                      {replyOk}
                    </p>
                  ) : null}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={replyDisabled || !replyBody.trim()}
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                      {isReplying ? 'Sending…' : 'Send reply'}
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <details className="group overflow-hidden rounded-xl border border-border bg-white dark:bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
          Log an email
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <form
          className="space-y-4 border-t border-border p-4 sm:p-5"
          onSubmit={handleLogEmail}
        >
        <div>
          <h3 className="text-sm font-semibold text-foreground">Log email</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Record a message that was sent or received outside HireIQ.
          </p>
        </div>

        <fieldset disabled={formDisabled}>
          <legend className="mb-2 text-xs font-medium text-foreground">Direction</legend>
          <div className="inline-flex rounded-lg border border-border bg-secondary p-1">
            {(['received', 'sent'] as const).map(option => (
              <button
                key={option}
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  direction === option
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={direction === option}
                onClick={() => setDirection(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="logged-email-sender" className="mb-1.5 block text-xs font-medium">
              Sender
            </label>
            <Input
              id="logged-email-sender"
              type="email"
              placeholder="sender@example.com"
              value={sender}
              disabled={formDisabled}
              onChange={event => setSender(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="logged-email-recipients" className="mb-1.5 block text-xs font-medium">
              Recipients
            </label>
            <Input
              id="logged-email-recipients"
              placeholder="you@example.com, recruiter@example.com"
              value={recipients}
              disabled={formDisabled}
              onChange={event => setRecipients(event.target.value)}
              aria-describedby="logged-email-recipients-help"
              required
            />
            <p id="logged-email-recipients-help" className="mt-1 text-[11px] text-muted-foreground">
              Separate multiple addresses with commas.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="logged-email-subject" className="mb-1.5 block text-xs font-medium">
            Subject
          </label>
          <Input
            id="logged-email-subject"
            placeholder="Interview follow-up"
            value={subject}
            disabled={formDisabled}
            onChange={event => setSubject(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="logged-email-body" className="mb-1.5 block text-xs font-medium">
            Message
          </label>
          <Textarea
            id="logged-email-body"
            className="min-h-32"
            placeholder="Paste the real email content here…"
            value={body}
            disabled={formDisabled}
            onChange={event => setBody(event.target.value)}
            required
          />
        </div>

        {formError ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-destructive" role="alert">
            <CircleAlert className="h-4 w-4" aria-hidden="true" />
            {formError}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={
              formDisabled ||
              !subject.trim() ||
              !body.trim() ||
              !sender.trim() ||
              parseRecipients(recipients).length === 0
            }
          >
            {isLogging ? (
              <Send className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            {isLogging ? 'Logging' : 'Log email'}
          </Button>
        </div>
        </form>
      </details>
    </section>
  )
}
