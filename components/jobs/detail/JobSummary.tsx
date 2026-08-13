'use client'

import { useState, type ReactNode } from 'react'
import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  History,
  KeyRound,
  ListChecks,
  Mail,
  MapPin,
  PanelRightClose,
  Sparkles,
  Target,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { buildJobDescriptionView } from '@/lib/jobs/description'
import {
  applicationStatusClasses,
  applicationStatusLabel,
} from '@/lib/jobs/status'
import { cn, scoreColor } from '@/lib/utils'
import type { ApplicationStatus, JobExtractedData } from '@/types'

export interface JobSummaryOverviewProps {
  score: number | null
  status: ApplicationStatus
  documentCount: number
  description: string | null | undefined
  extracted: JobExtractedData | null | undefined
  hasTailoredResume: boolean
  onOpenDocuments: () => void
  onOpenActivity: () => void
  onOpenDescription: () => void
  className?: string
}

export interface JobSummaryDescriptionProps {
  description: string | null | undefined
  extracted: JobExtractedData | null | undefined
  applyUrl?: string | null
  className?: string
}

export interface JobSummaryActivityItem {
  id: string
  title: string
  detail?: string
  at: string
}

export interface JobFactsRailProps {
  company: string
  title: string
  location?: string | null
  remoteType?: string | null
  applyUrl?: string | null
  extracted?: JobExtractedData | null
  portalEmail?: string | null
  portalPassword?: string | null
  portalNote?: string | null
  activity: readonly JobSummaryActivityItem[]
  onSeeAllActivity?: () => void
  onCollapseRail?: () => void
  defaultOpen?: boolean
  className?: string
}

type JobFact = {
  label: string
  value: string
  icon: typeof BriefcaseBusiness
}

export function JobSummaryOverview({
  score,
  status,
  documentCount,
  description,
  extracted,
  hasTailoredResume,
  onOpenDocuments,
  onOpenActivity,
  onOpenDescription,
  className,
}: JobSummaryOverviewProps) {
  const descriptionView = buildJobDescriptionView(description, extracted)
  const summary =
    descriptionView.summary ||
    'No job summary is available yet. Open the full description to review the saved posting.'

  return (
    <section className={cn('space-y-4', className)} aria-labelledby="job-overview-heading">
      <h2 id="job-overview-heading" className="sr-only">
        Job overview
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryMetric
          icon={<Target className="size-4" aria-hidden="true" />}
          label="Match score"
          value={
            score == null ? (
              'Not scored'
            ) : (
              <span className={cn('tabular-nums', scoreColor(score))}>{score}%</span>
            )
          }
        />
        <SummaryMetric
          icon={<Sparkles className="size-4" aria-hidden="true" />}
          label="Status"
          value={
            <span
              className={cn(
                'inline-flex rounded-md border px-2 py-0.5 text-sm font-medium',
                applicationStatusClasses(status)
              )}
            >
              {applicationStatusLabel(status)}
            </span>
          }
        />
        <SummaryMetric
          icon={<FileText className="size-4" aria-hidden="true" />}
          label="Documents"
          value={
            documentCount > 0
              ? `${documentCount} resume${documentCount === 1 ? '' : 's'}`
              : 'None yet'
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Quick actions</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Keep this application moving without losing your place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onOpenDocuments}>
              <FileText className="size-3.5" aria-hidden="true" />
              {hasTailoredResume ? 'View resume' : 'Create resume'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onOpenActivity}>
              <Mail className="size-3.5" aria-hidden="true" />
              Notes & activity
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <ListChecks className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">At a glance</h3>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onOpenDescription}>
            Full description
          </Button>
        </div>
        <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {summary}
        </p>
      </div>
    </section>
  )
}

export function JobSummaryDescription({
  description,
  extracted,
  applyUrl,
  className,
}: JobSummaryDescriptionProps) {
  const view = buildJobDescriptionView(description, extracted)
  const safeApplyUrl = getSafeHttpUrl(applyUrl)

  return (
    <article
      className={cn('rounded-xl border border-border bg-card shadow-sm', className)}
      aria-labelledby="structured-description-heading"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Role brief
          </p>
          <h2
            id="structured-description-heading"
            className="mt-1 text-lg font-semibold tracking-tight text-foreground"
          >
            Job description
          </h2>
        </div>
        {safeApplyUrl ? (
          <Button asChild type="button" size="sm" variant="outline">
            <a href={safeApplyUrl} target="_blank" rel="noreferrer">
              View original
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
        ) : null}
      </header>

      <div className="divide-y divide-border px-4">
        <DescriptionSection title="Summary" emptyMessage="No summary was extracted.">
          {view.summary ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
              {view.summary}
            </p>
          ) : null}
        </DescriptionSection>

        <DescriptionSection
          title="Responsibilities"
          emptyMessage="No responsibilities were extracted."
        >
          {view.responsibilities.length > 0 ? (
            <DescriptionList items={view.responsibilities} />
          ) : null}
        </DescriptionSection>

        {view.requirements.length > 0 ? (
          <DescriptionSection title="Requirements">
            <DescriptionList items={view.requirements} />
          </DescriptionSection>
        ) : null}

        {view.keywords.length > 0 ? (
          <DescriptionSection title="Keywords">
            <ul className="flex flex-wrap gap-1.5" aria-label="Job keywords">
              {view.keywords.map(keyword => (
                <li
                  key={keyword}
                  className="rounded-md border border-border bg-secondary/55 px-2 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {keyword}
                </li>
              ))}
            </ul>
          </DescriptionSection>
        ) : null}
      </div>

      <details className="group border-t border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
          Full posting
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="border-t border-border bg-secondary/20 px-4 py-4">
          {view.fullText ? (
            <div className="space-y-2.5 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
              {view.fullText.split(/\n\n+/).map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              No full posting text was saved for this job.
            </p>
          )}
        </div>
      </details>
    </article>
  )
}

export function JobFactsRail({
  company,
  title,
  location,
  remoteType,
  applyUrl,
  extracted,
  portalEmail,
  portalPassword,
  portalNote,
  activity,
  onSeeAllActivity,
  onCollapseRail,
  defaultOpen = true,
  className,
}: JobFactsRailProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const safeApplyUrl = getSafeHttpUrl(applyUrl)
  const posting = getPostingIdentity(applyUrl)
  const facts = buildJobFacts(location, remoteType, extracted)

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        className
      )}
    >
      <div className="flex items-center gap-1 p-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(open => !open)}
        >
          <span className="text-sm font-semibold text-foreground">Job facts</span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
        {onCollapseRail ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onCollapseRail}
            aria-label="Hide job details"
          >
            <PanelRightClose className="size-4" />
          </Button>
        ) : null}
      </div>

      {isOpen ? <div className="border-t border-border">
        <div className="flex items-start gap-3 p-4">
          <CompanyMark
            company={company}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-snug text-foreground">{company}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{title}</p>
            {posting ? (
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{posting.domain}</p>
            ) : null}
          </div>
        </div>

        {safeApplyUrl ? (
          <div className="px-4 pb-4">
            <Button asChild size="sm" variant="outline" className="w-full">
              <a href={safeApplyUrl} target="_blank" rel="noreferrer">
                View original posting
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
          </div>
        ) : null}

        <PortalLoginSection
          email={portalEmail}
          password={portalPassword}
          note={portalNote}
        />

        <div className="border-t border-border p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Role details
          </h3>
          {facts.length > 0 ? (
            <dl className="mt-3 space-y-3">
              {facts.map(fact => {
                const Icon = fact.icon
                return (
                  <div key={fact.label} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2">
                    <Icon className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-[11px] text-muted-foreground">{fact.label}</dt>
                      <dd className="mt-0.5 break-words text-xs font-medium text-foreground">
                        {fact.value}
                      </dd>
                    </div>
                  </div>
                )
              })}
            </dl>
          ) : (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              No role facts were extracted from this posting.
            </p>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <History className="size-3.5" aria-hidden="true" />
              Recent activity
            </h3>
            {onSeeAllActivity ? (
              <Button type="button" size="sm" variant="ghost" onClick={onSeeAllActivity}>
                See all
              </Button>
            ) : null}
          </div>

          {activity.length > 0 ? (
            <ol className="mt-3 space-y-3">
              {activity.slice(0, 5).map(item => (
                <li key={item.id} className="relative pl-4">
                  <span
                    className="absolute left-0 top-1.5 size-1.5 rounded-full bg-brand-green"
                    aria-hidden="true"
                  />
                  <p className="text-xs font-medium leading-5 text-foreground">{item.title}</p>
                  {item.detail ? (
                    <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                      {item.detail}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatActivityDate(item.at)}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              No activity yet. Status changes and notes will appear here.
            </p>
          )}
        </div>
      </div> : null}
    </section>
  )
}

function SummaryMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <div className="mt-2 text-lg font-semibold text-foreground">{value}</div>
    </div>
  )
}

function DescriptionSection({
  title,
  emptyMessage,
  children,
}: {
  title: string
  emptyMessage?: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-2.5 py-4 md:grid-cols-[8rem_minmax(0,1fr)]">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div>
        {children ||
          (emptyMessage ? (
            <p className="text-sm leading-6 text-muted-foreground">{emptyMessage}</p>
          ) : null)}
      </div>
    </section>
  )
}

function DescriptionList({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null

  return (
    <ul className="space-y-1.5 text-sm leading-6 text-foreground/90">
      {items.map(item => (
        <li key={item} className="grid grid-cols-[0.375rem_minmax(0,1fr)] gap-2.5">
          <span className="mt-2.5 size-1.5 rounded-full bg-brand-green" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function CompanyMark({
  company,
}: {
  company: string
}) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-brand-green/20 bg-brand-green/10 text-sm font-semibold text-brand-green">
      <span aria-hidden="true">{getCompanyInitials(company)}</span>
    </span>
  )
}

function getPostingIdentity(
  applyUrl: string | null | undefined
): { domain: string } | null {
  const safeUrl = getSafeHttpUrl(applyUrl)
  if (!safeUrl) return null

  try {
    const url = new URL(safeUrl)
    return {
      domain: url.hostname.replace(/^www\./i, ''),
    }
  } catch {
    return null
  }
}

function getSafeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}

function buildJobFacts(
  location: string | null | undefined,
  remoteType: string | null | undefined,
  extracted: JobExtractedData | null | undefined
): JobFact[] {
  const facts: JobFact[] = []
  const workType = extracted?.work_type || remoteType

  if (workType) {
    facts.push({ label: 'Work type', value: titleCase(workType), icon: BriefcaseBusiness })
  }
  if (extracted?.seniority) {
    facts.push({ label: 'Level', value: titleCase(extracted.seniority), icon: Building2 })
  }

  const compensation = formatCompensation(extracted)
  if (compensation) {
    facts.push({ label: 'Compensation', value: compensation, icon: Banknote })
  }
  if (
    extracted?.required_experience_years != null &&
    extracted.required_experience_years > 0
  ) {
    facts.push({
      label: 'Experience',
      value: `${extracted.required_experience_years}+ years`,
      icon: CalendarClock,
    })
  }
  if (extracted?.education_requirement) {
    facts.push({
      label: 'Education',
      value: extracted.education_requirement,
      icon: GraduationCap,
    })
  }
  if (location) {
    facts.push({ label: 'Location', value: location, icon: MapPin })
  }

  return facts
}

function formatCompensation(extracted: JobExtractedData | null | undefined): string | null {
  const compensation = extracted?.compensation
  if (!compensation || (compensation.min == null && compensation.max == null)) return null

  const currency = compensation.currency === 'USD' || !compensation.currency
    ? '$'
    : `${compensation.currency} `
  const formatAmount = (amount: number) =>
    amount >= 1000 ? `${currency}${Math.round(amount / 1000)}k` : `${currency}${amount}`

  let range: string
  if (compensation.min != null && compensation.max != null) {
    range = `${formatAmount(compensation.min)} – ${formatAmount(compensation.max)}`
  } else if (compensation.min != null) {
    range = `${formatAmount(compensation.min)}+`
  } else {
    range = formatAmount(compensation.max as number)
  }

  return compensation.period ? `${range} / ${compensation.period}` : range
}

function getCompanyInitials(company: string): string {
  const initials = company
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toLocaleUpperCase())
    .join('')

  return initials || '?'
}

function formatActivityDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toLocaleUpperCase())
}

export function PortalLoginSection({
  email,
  password,
  note,
  className,
}: {
  email?: string | null
  password?: string | null
  note?: string | null
  className?: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null)

  const trimmedEmail = email?.trim() ?? ''
  const trimmedPassword = password?.trim() ?? ''
  const trimmedNote = note?.trim() ?? ''

  if (!trimmedEmail && !trimmedPassword && !trimmedNote) return null

  async function copyValue(value: string, field: 'email' | 'password') {
    if (!value || !navigator.clipboard?.writeText) return
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    window.setTimeout(() => setCopiedField(current => (current === field ? null : current)), 1500)
  }

  return (
    <div className={cn(className ?? 'border-t border-border p-4')}>
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <KeyRound className="size-3.5" aria-hidden="true" />
        Portal login
      </h3>
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
        Saved from the extension when you created an employer account.
      </p>

      <dl className="mt-3 space-y-3">
        {trimmedEmail ? (
          <PortalCredentialRow
            label="Email"
            value={trimmedEmail}
            copied={copiedField === 'email'}
            onCopy={() => copyValue(trimmedEmail, 'email')}
          />
        ) : null}

        {trimmedPassword ? (
          <PortalCredentialRow
            label="Password"
            value={trimmedPassword}
            masked={!showPassword}
            copied={copiedField === 'password'}
            onCopy={() => copyValue(trimmedPassword, 'password')}
            trailing={
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(open => !open)}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
            }
          />
        ) : null}

        {trimmedNote ? (
          <div>
            <dt className="text-[11px] text-muted-foreground">Note</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-foreground">{trimmedNote}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

function PortalCredentialRow({
  label,
  value,
  copied,
  onCopy,
  masked = false,
  trailing,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
  masked?: boolean
  trailing?: ReactNode
}) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-1">
        <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs text-foreground">
          {masked ? '••••••••••••' : value}
        </code>
        {trailing}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={onCopy}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </dd>
    </div>
  )
}
