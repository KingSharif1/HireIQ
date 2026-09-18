'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { uid } from '@/lib/profile/data'
import { normalizeApplyAnswers } from '@/lib/profile/apply-answers'
import type {
  ProfileData,
  ProfileApplyAnswers,
  ResumeExperience,
  ResumeProject,
  ResumeEducation,
  ProfileVolunteering,
  ProfileAchievement,
  ProfileURL,
} from '@/types'
import {
  Field,
  NativeSelect,
  SectionHeader,
  EmptyState,
  EntryCard,
  BulletEditor,
  TagInput,
  MonthRange,
} from './primitives'
import { ProvenanceBulletEditor } from './ProvenanceBulletEditor'
import { GitHubConnectPanel } from './GitHubConnectPanel'
import { GitHubRepoField } from './GitHubRepoField'
import { PendingSuggestionsPanel } from './PendingSuggestionsPanel'
import { Suspense } from 'react'
import { bulletsWithIds } from '@/lib/profile/bullets'
import {
  addGitHubProjectHighlight,
  recordBulletEdit,
  entrySourceLabel,
} from '@/lib/profile/provenance'
import { focusNewEntry } from '@/lib/profile/focus-entry'
import type { AcceptedSuggestionFocus } from '@/lib/profile/suggestion-focus'
import { cn } from '@/lib/utils'

type Update = (patch: Partial<ProfileData>) => void

// ---------------------------------------------------------------------------
// Personal Info
// ---------------------------------------------------------------------------

export function PersonalSection({ data, update }: { data: ProfileData; update: Update }) {
  const p = data.personal
  const set = (patch: Partial<typeof p>) => update({ personal: { ...p, ...patch } })

  return (
    <div>
      <SectionHeader title="Personal Info" description="The basics that appear at the top of every resume." />
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="First name" required>
            <Input value={p.firstName} onChange={e => set({ firstName: e.target.value })} placeholder="John" />
          </Field>
          <Field label="Last name" required>
            <Input value={p.lastName} onChange={e => set({ lastName: e.target.value })} placeholder="Smith" />
          </Field>
        </div>
        <Field label="Headline" hint="A short professional title, e.g. “Senior Frontend Engineer”.">
          <Input value={p.headline} onChange={e => set({ headline: e.target.value })} placeholder="Software Engineer" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Email" required>
            <Input type="email" value={p.email} onChange={e => set({ email: e.target.value })} placeholder="you@email.com" />
          </Field>
          <Field label="Phone">
            <Input value={p.phone} onChange={e => set({ phone: e.target.value })} placeholder="(555) 123-4567" />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Location">
            <Input value={p.location} onChange={e => set({ location: e.target.value })} placeholder="City, State" />
          </Field>
          <Field label="Pronouns">
            <Input value={p.pronouns} onChange={e => set({ pronouns: e.target.value })} placeholder="they/them" />
          </Field>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">Application information</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Work eligibility, salary preferences, voluntary demographics, and reusable answers.
              Never printed on your resume.
            </p>
          </div>
          <div className="px-4 py-4">
            <ApplyAnswersSection data={data} update={update} embedded />
          </div>
        </div>
      </div>
    </div>
  )
}

const YES_NO = [
  { value: '', label: 'Not set' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

const GENDER_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not', label: 'Prefer not to answer' },
]

const ETHNICITY_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'american_indian_alaska_native', label: 'American Indian or Alaska Native' },
  { value: 'asian', label: 'Asian' },
  { value: 'black_african_american', label: 'Black or African American' },
  { value: 'hispanic_latino', label: 'Hispanic or Latino' },
  { value: 'middle_eastern_north_african', label: 'Middle Eastern or North African' },
  { value: 'native_hawaiian_pacific_islander', label: 'Native Hawaiian or Other Pacific Islander' },
  { value: 'white', label: 'White' },
  { value: 'two_or_more', label: 'Two or more races' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not', label: 'Prefer not to answer' },
]

const VETERAN_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'not_protected_veteran', label: 'I am not a protected veteran' },
  { value: 'protected_veteran', label: 'I identify as a protected veteran' },
  { value: 'prefer_not', label: 'Prefer not to answer' },
]

const DISABILITY_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'no', label: 'No, I do not have a disability' },
  { value: 'yes', label: 'Yes, I have a disability or had one previously' },
  { value: 'prefer_not', label: 'Prefer not to answer' },
]

function optionsWithCurrent(
  options: { value: string; label: string }[],
  current: string
): { value: string; label: string }[] {
  if (!current || options.some(option => option.value === current)) return options
  return [options[0], { value: current, label: current }, ...options.slice(1)]
}

function ApplySelect({
  label,
  hint,
  value,
  onChange,
  options = YES_NO,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  options?: { value: string; label: string }[]
}) {
  return (
    <Field label={label} hint={hint}>
      <NativeSelect value={value} onChange={onChange} aria-label={label}>
        {options.map(opt => (
          <option key={opt.value || 'blank'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )
}

export function ApplyAnswersSection({
  data,
  update,
  embedded = false,
}: {
  data: ProfileData
  update: Update
  embedded?: boolean
}) {
  const answers = normalizeApplyAnswers(data.applyAnswers)
  const set = (patch: Partial<ProfileApplyAnswers>) =>
    update({ applyAnswers: { ...answers, ...patch } })

  return (
    <div>
      {!embedded && (
        <SectionHeader
          title="Application form"
          description="Answers HireIQ reuses on Greenhouse-like apply forms. Not printed on your resume."
        />
      )}
      <div className="space-y-6">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Work eligibility
          </p>
          <Field label="Country" hint="Used for Country dropdowns on apply forms.">
            <Input
              value={answers.country}
              onChange={e => set({ country: e.target.value })}
              placeholder="United States"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ApplySelect
              label="Authorized to work in the U.S.?"
              value={answers.workAuthorizedUS}
              onChange={v => set({ workAuthorizedUS: v as ProfileApplyAnswers['workAuthorizedUS'] })}
            />
            <ApplySelect
              label="Will you need visa sponsorship?"
              value={answers.requiresSponsorship}
              onChange={v => set({ requiresSponsorship: v as ProfileApplyAnswers['requiresSponsorship'] })}
            />
            <ApplySelect
              label="Willing to relocate?"
              value={answers.willingToRelocate}
              onChange={v => set({ willingToRelocate: v as ProfileApplyAnswers['willingToRelocate'] })}
            />
            <ApplySelect
              label="OK with in-office / hybrid?"
              value={answers.inOfficeOk}
              onChange={v => set({ inOfficeOk: v as ProfileApplyAnswers['inOfficeOk'] })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Salary expectations
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional annual base-salary range. Used only when an application asks.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Minimum salary">
              <Input
                type="number"
                min="0"
                step="1000"
                value={answers.desiredSalaryMin}
                onChange={e => set({ desiredSalaryMin: e.target.value })}
                placeholder="70000"
              />
            </Field>
            <Field label="Maximum salary">
              <Input
                type="number"
                min="0"
                step="1000"
                value={answers.desiredSalaryMax}
                onChange={e => set({ desiredSalaryMax: e.target.value })}
                placeholder="115000"
              />
            </Field>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Equal opportunity (optional)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Voluntary. Employers often ask. Leave blank to skip. Never invented by HireIQ.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date of birth" hint="Leave blank unless you want HireIQ to reuse it.">
              <Input
                type="date"
                value={answers.dateOfBirth}
                onChange={e => set({ dateOfBirth: e.target.value })}
              />
            </Field>
            <ApplySelect
              label="Gender"
              value={answers.gender}
              options={optionsWithCurrent(GENDER_OPTIONS, answers.gender)}
              onChange={gender => set({ gender })}
            />
            <ApplySelect
              label="Race / ethnicity"
              value={answers.ethnicity}
              options={optionsWithCurrent(ETHNICITY_OPTIONS, answers.ethnicity)}
              onChange={ethnicity => set({ ethnicity })}
            />
            <ApplySelect
              label="Veteran status"
              value={answers.veteran}
              options={optionsWithCurrent(VETERAN_OPTIONS, answers.veteran)}
              onChange={veteran => set({ veteran })}
            />
            <ApplySelect
              label="Disability"
              value={answers.disability}
              options={optionsWithCurrent(DISABILITY_OPTIONS, answers.disability)}
              onChange={disability => set({ disability })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saved from applications
          </p>
          {answers.saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              When you answer a question on a job (or in the extension), it shows up here so the next
              apply can reuse it.
            </p>
          ) : (
            <ul className="space-y-2">
              {answers.saved.map(entry => (
                <li key={entry.key} className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-sm font-medium text-foreground">{entry.question}</p>
                  <Textarea
                    className="mt-2"
                    rows={2}
                    value={entry.answer}
                    onChange={e =>
                      set({
                        saved: answers.saved.map(s =>
                          s.key === entry.key ? { ...s, answer: e.target.value } : s,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="mt-1 text-xs text-destructive hover:underline"
                    onClick={() => set({ saved: answers.saved.filter(s => s.key !== entry.key) })}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export function SummarySection({
  data,
  update,
  onSuggestionResolved,
  acceptedFocus,
}: {
  data: ProfileData
  update: Update
  onSuggestionResolved?: (id: string, action: 'accept' | 'decline') => Promise<void>
  acceptedFocus?: AcceptedSuggestionFocus | null
}) {
  const pending = (data.pendingSuggestions ?? []).filter(s => s.section === 'summary')
  return (
    <div>
      <SectionHeader title="Summary" description="A 2–4 sentence professional overview. This anchors your tailored resumes." />
      {pending.length > 0 && onSuggestionResolved && (
        <div className="mb-4">
          <PendingSuggestionsPanel
            suggestions={pending}
            onResolved={onSuggestionResolved}
            placement="field"
          />
        </div>
      )}
      <Textarea
        className={acceptedFocus?.section === 'summary' ? 'border-brand-green/60 bg-brand-green/5 ring-2 ring-brand-green/15' : undefined}
        value={data.summary}
        onChange={e => update({ summary: e.target.value })}
        rows={6}
        placeholder="Results-driven engineer with 5+ years building scalable web apps…"
      />
      <p className="text-xs text-muted-foreground mt-2">{data.summary.trim().split(/\s+/).filter(Boolean).length} words</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

export function UrlsSection({ data, update }: { data: ProfileData; update: Update }) {
  const urls = data.urls
  const add = () => {
    const item = { id: uid('url'), label: '', url: '' }
    update({ urls: [item, ...urls] })
    focusNewEntry(item.id)
  }
  const setItem = (id: string, patch: Partial<ProfileURL>) =>
    update({ urls: urls.map(u => (u.id === id ? { ...u, ...patch } : u)) })
  const remove = (id: string) => update({ urls: urls.filter(u => u.id !== id) })

  return (
    <div>
      <SectionHeader
        title="URLs"
        description="LinkedIn, GitHub, portfolio, or any link worth showing."
        action={<Button size="sm" onClick={add}><Plus className="w-4 h-4" />Add URL</Button>}
      />
      {urls.length === 0 ? (
        <EmptyState message="No links added yet." actionLabel="Add URL" onAction={add} />
      ) : (
        <div className="space-y-3">
          {urls.map(u => (
            <div key={u.id} id={`entry-${u.id}`} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
              <Input value={u.label} onChange={e => setItem(u.id, { label: e.target.value })} placeholder="LinkedIn" />
              <Input value={u.url} onChange={e => setItem(u.id, { url: e.target.value })} placeholder="https://…" />
              <Button variant="ghost" size="icon" onClick={() => remove(u.id)} aria-label="Remove">×</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

export function ExperienceSection({
  data,
  update,
  onSuggestionResolved,
  acceptedFocus,
}: {
  data: ProfileData
  update: Update
  onSuggestionResolved?: (id: string, action: 'accept' | 'decline') => Promise<void>
  acceptedFocus?: AcceptedSuggestionFocus | null
}) {
  const items = data.experience
  const pending = (data.pendingSuggestions ?? []).filter(s => s.section === 'experience')
  const newPending = pending.filter(
    suggestion =>
      !suggestion.targetEntryId ||
      !items.some(entry => entry.id === suggestion.targetEntryId)
  )
  const add = () => {
    const { bullets, bulletIds } = bulletsWithIds([''], undefined, 'bul')
    const item = {
      id: uid('exp'),
      company: '',
      title: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets,
      bulletIds,
      skills_used: [],
    }
    update({ experience: [item, ...items] })
    focusNewEntry(item.id)
  }
  const setItem = (id: string, patch: Partial<ResumeExperience>) =>
    update({ experience: items.map(x => (x.id === id ? { ...x, ...patch } : x)) })
  const remove = (id: string) => update({ experience: items.filter(x => x.id !== id) })

  return (
    <div>
      <SectionHeader
        title="Experience"
        description="Your work history. Lead each bullet with a strong action verb."
        action={<Button size="sm" onClick={add}><Plus className="w-4 h-4" />Add role</Button>}
      />
      {newPending.length > 0 && onSuggestionResolved && (
        <div className="mb-4">
          <PendingSuggestionsPanel suggestions={newPending} onResolved={onSuggestionResolved} />
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState message="No experience added yet." actionLabel="Add role" onAction={add} />
      ) : (
        <div className="space-y-3">
          {items.map(exp => {
            const entrySuggestions = pending.filter(s => s.targetEntryId === exp.id)
            return (
              <EntryCard
              key={exp.id}
              entryId={exp.id}
              title={exp.title || 'New role'}
              subtitle={[exp.company, exp.location].filter(Boolean).join(' · ')}
              sourceLine={entrySourceLabel(data.provenance, exp.bulletIds, exp.bullets)}
              onRemove={() => remove(exp.id)}
              defaultOpen={!exp.title || entrySuggestions.length > 0}
              emphasized={acceptedFocus?.entryId === exp.id}
              attention={entrySuggestions.length > 0}
            >
              {entrySuggestions.length > 0 && onSuggestionResolved && (
                <PendingSuggestionsPanel
                  suggestions={entrySuggestions}
                  onResolved={onSuggestionResolved}
                  placement="entry"
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Title"><Input value={exp.title} onChange={e => setItem(exp.id, { title: e.target.value })} placeholder="Software Engineer" /></Field>
                <Field label="Company"><Input value={exp.company} onChange={e => setItem(exp.id, { company: e.target.value })} placeholder="Acme Inc." /></Field>
              </div>
              <Field label="Location"><Input value={exp.location} onChange={e => setItem(exp.id, { location: e.target.value })} placeholder="Remote · San Francisco, CA" /></Field>
              <MonthRange
                start={exp.startDate}
                end={exp.endDate}
                current={exp.current}
                onChange={patch => setItem(exp.id, patch)}
              />
              <Field label="Highlights">
                <ProvenanceBulletEditor
                  bullets={exp.bullets}
                  bulletIds={exp.bulletIds ?? bulletsWithIds(exp.bullets, exp.bulletIds).bulletIds}
                  provenance={data.provenance ?? {}}
                  highlightBulletId={
                    acceptedFocus?.entryId === exp.id ? acceptedFocus.bulletId : undefined
                  }
                  onChange={(bullets, bulletIds, edits) => {
                    let provenance = data.provenance ?? {}
                    for (const e of edits) {
                      provenance = recordBulletEdit(
                        { ...data, provenance },
                        e.bulletId,
                        e.before,
                        e.after
                      ).provenance ?? provenance
                    }
                    update({
                      provenance,
                      experience: items.map(x =>
                        x.id === exp.id ? { ...x, bullets, bulletIds } : x
                      ),
                    })
                  }}
                />
              </Field>
              </EntryCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Volunteering
// ---------------------------------------------------------------------------

export function VolunteeringSection({ data, update }: { data: ProfileData; update: Update }) {
  const items = data.volunteering
  const add = () => {
    const item = {
      id: uid('vol'),
      organization: '',
      role: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: [''],
    }
    update({ volunteering: [item, ...items] })
    focusNewEntry(item.id)
  }
  const setItem = (id: string, patch: Partial<ProfileVolunteering>) =>
    update({ volunteering: items.map(x => (x.id === id ? { ...x, ...patch } : x)) })
  const remove = (id: string) => update({ volunteering: items.filter(x => x.id !== id) })

  return (
    <div>
      <SectionHeader
        title="Volunteering"
        description="Community work, nonprofits, and pro-bono contributions."
        action={<Button size="sm" onClick={add}><Plus className="w-4 h-4" />Add</Button>}
      />
      {items.length === 0 ? (
        <EmptyState message="No volunteering added yet." actionLabel="Add volunteering" onAction={add} />
      ) : (
        <div className="space-y-3">
          {items.map(v => (
            <EntryCard
              key={v.id}
              entryId={v.id}
              title={v.role || 'New entry'}
              subtitle={v.organization}
              onRemove={() => remove(v.id)}
              defaultOpen={!v.role}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Role"><Input value={v.role} onChange={e => setItem(v.id, { role: e.target.value })} placeholder="Mentor" /></Field>
                <Field label="Organization"><Input value={v.organization} onChange={e => setItem(v.id, { organization: e.target.value })} placeholder="Code.org" /></Field>
              </div>
              <Field label="Location"><Input value={v.location} onChange={e => setItem(v.id, { location: e.target.value })} placeholder="Remote" /></Field>
              <MonthRange start={v.startDate} end={v.endDate} current={v.current} onChange={patch => setItem(v.id, patch)} />
              <Field label="Highlights">
                <BulletEditor bullets={v.bullets} onChange={bullets => setItem(v.id, { bullets })} />
              </Field>
            </EntryCard>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function ProjectsSection({
  data,
  update,
  githubData,
  repoIntelligence,
  onSuggestionResolved,
  onGitHubSynced,
  acceptedFocus,
}: {
  data: ProfileData
  update: Update
  githubData?: import('@/lib/github/types').GitHubProfileData | null
  repoIntelligence?: Record<number, import('@/lib/github/types').RepoIntelligenceRecord>
  onSuggestionResolved?: (id: string, action: 'accept' | 'decline') => Promise<void>
  onGitHubSynced?: () => void
  acceptedFocus?: AcceptedSuggestionFocus | null
}) {
  const items = data.projects
  const pending = (data.pendingSuggestions ?? []).filter(s => s.section === 'projects')
  const newPending = pending.filter(
    suggestion =>
      !suggestion.targetEntryId ||
      !items.some(entry => entry.id === suggestion.targetEntryId)
  )
  const add = () => {
    const item = {
      id: uid('proj'),
      name: '',
      description: '',
      bullets: [''],
      technologies: [],
      url: '',
      github: '',
    }
    update({ projects: [item, ...items] })
    focusNewEntry(item.id)
  }
  const addFromGithub = (project: ResumeProject) => {
    update({ projects: [project, ...items] })
    focusNewEntry(project.id)
  }
  const setItem = (id: string, patch: Partial<ResumeProject>) =>
    update({ projects: items.map(x => (x.id === id ? { ...x, ...patch } : x)) })
  const remove = (id: string) => update({ projects: items.filter(x => x.id !== id) })

  return (
    <div>
      <SectionHeader
        title="Projects"
        description="Side projects, open source, or notable work products."
        action={<Button size="sm" onClick={add}><Plus className="w-4 h-4" />Add project</Button>}
      />
      {newPending.length > 0 && onSuggestionResolved && (
        <div className="mb-4">
          <PendingSuggestionsPanel suggestions={newPending} onResolved={onSuggestionResolved} />
        </div>
      )}
      <Suspense fallback={null}>
        <GitHubConnectPanel
          initialGithubData={githubData ?? null}
          existing={items}
          onSynced={onGitHubSynced}
          onAddProject={addFromGithub}
          onLinkProject={(projectId, githubUrl) =>
            setItem(projectId, { github: githubUrl, source: 'github' })
          }
        />
      </Suspense>
      {items.length === 0 ? (
        <EmptyState message="No projects added yet." actionLabel="Add project" onAction={add} />
      ) : (
        <div className="space-y-3">
          {items.map(proj => {
            const entrySuggestions = pending.filter(s => s.targetEntryId === proj.id)
            return (
              <EntryCard
              key={proj.id}
              entryId={proj.id}
              title={proj.name || 'New project'}
              subtitle={proj.technologies?.join(', ')}
              sourceBadge={
                proj.source === 'github' || proj.github
                  ? 'github'
                  : proj.source === 'resume'
                    ? 'resume'
                    : null
              }
              sourceLine={
                entrySourceLabel(data.provenance, proj.bulletIds) ??
                (proj.github ? 'From GitHub' : proj.source === 'resume' ? 'From uploaded resume' : null)
              }
              sourceHref={proj.github || null}
              onRemove={() => remove(proj.id)}
              defaultOpen={!proj.name || entrySuggestions.length > 0}
              emphasized={acceptedFocus?.entryId === proj.id}
              attention={entrySuggestions.length > 0}
            >
              {entrySuggestions.length > 0 && onSuggestionResolved && (
                <PendingSuggestionsPanel
                  suggestions={entrySuggestions}
                  onResolved={onSuggestionResolved}
                  placement="entry"
                />
              )}
              <Field label="Name"><Input value={proj.name} onChange={e => setItem(proj.id, { name: e.target.value })} placeholder="Project name" /></Field>
              <Field label="Live URL"><Input value={proj.url} onChange={e => setItem(proj.id, { url: e.target.value })} placeholder="https://…" /></Field>
              <GitHubRepoField
                project={proj}
                repos={githubData?.repos ?? []}
                intelligenceByRepoId={repoIntelligence ?? {}}
                onChange={patch => setItem(proj.id, patch)}
                onAddHighlight={(text, sourceLabel, technologies) =>
                  update(addGitHubProjectHighlight(data, proj.id, text, sourceLabel, technologies))
                }
              />
              <Field label="Technologies">
                <TagInput tags={proj.technologies} onChange={technologies => setItem(proj.id, { technologies })} placeholder="React, Node, Postgres…" />
              </Field>
              <Field label="Highlights">
                <ProvenanceBulletEditor
                  bullets={proj.bullets}
                  bulletIds={
                    proj.bulletIds ?? bulletsWithIds(proj.bullets, proj.bulletIds, 'pbul').bulletIds
                  }
                  provenance={data.provenance ?? {}}
                  highlightBulletId={
                    acceptedFocus?.entryId === proj.id ? acceptedFocus.bulletId : undefined
                  }
                  onChange={(bullets, bulletIds, edits) => {
                    let provenance = data.provenance ?? {}
                    for (const edit of edits) {
                      provenance = recordBulletEdit(
                        { ...data, provenance },
                        edit.bulletId,
                        edit.before,
                        edit.after
                      ).provenance ?? provenance
                    }
                    update({
                      provenance,
                      projects: items.map(item =>
                        item.id === proj.id ? { ...item, bullets, bulletIds } : item
                      ),
                    })
                  }}
                />
              </Field>
              </EntryCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

export function EducationSection({ data, update }: { data: ProfileData; update: Update }) {
  const items = data.education
  const add = () => {
    const item = {
      id: uid('edu'),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      gpa: '',
      relevant_courses: [],
      honors: [],
    }
    update({ education: [item, ...items] })
    focusNewEntry(item.id)
  }
  const setItem = (id: string, patch: Partial<ResumeEducation>) =>
    update({ education: items.map(x => (x.id === id ? { ...x, ...patch } : x)) })
  const remove = (id: string) => update({ education: items.filter(x => x.id !== id) })

  return (
    <div>
      <SectionHeader
        title="Education"
        description="Degrees, schools, and relevant coursework."
        action={<Button size="sm" onClick={add}><Plus className="w-4 h-4" />Add education</Button>}
      />
      {items.length === 0 ? (
        <EmptyState message="No education added yet." actionLabel="Add education" onAction={add} />
      ) : (
        <div className="space-y-3">
          {items.map(edu => (
            <EntryCard key={edu.id} entryId={edu.id} title={edu.degree || 'New entry'} subtitle={edu.institution} onRemove={() => remove(edu.id)} defaultOpen={!edu.degree}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Degree"><Input value={edu.degree} onChange={e => setItem(edu.id, { degree: e.target.value })} placeholder="B.S." /></Field>
                <Field label="Field of study"><Input value={edu.field} onChange={e => setItem(edu.id, { field: e.target.value })} placeholder="Computer Science" /></Field>
              </div>
              <Field label="Institution"><Input value={edu.institution} onChange={e => setItem(edu.id, { institution: e.target.value })} placeholder="State University" /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Start"><Input value={edu.startDate} onChange={e => setItem(edu.id, { startDate: e.target.value })} placeholder="2018" /></Field>
                <Field label="End"><Input value={edu.endDate} onChange={e => setItem(edu.id, { endDate: e.target.value })} placeholder="2022" /></Field>
                <Field label="GPA"><Input value={edu.gpa} onChange={e => setItem(edu.id, { gpa: e.target.value })} placeholder="3.8" /></Field>
              </div>
            </EntryCard>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skills & Certs
// ---------------------------------------------------------------------------

export function SkillsSection({
  data,
  update,
  onSuggestionResolved,
  acceptedFocus,
}: {
  data: ProfileData
  update: Update
  onSuggestionResolved?: (id: string, action: 'accept' | 'decline') => Promise<void>
  acceptedFocus?: AcceptedSuggestionFocus | null
}) {
  const s = data.skills
  const pending = (data.pendingSuggestions ?? []).filter(s => s.section === 'skills')
  const setSkills = (patch: Partial<typeof s>) => update({ skills: { ...s, ...patch } })
  const certs = data.certifications
  const addCert = () =>
    update({ certifications: [...certs, { name: '', issuer: '', date: '', url: '' }] })
  const setCert = (i: number, patch: Partial<(typeof certs)[number]>) =>
    update({ certifications: certs.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  const removeCert = (i: number) => update({ certifications: certs.filter((_, j) => j !== i) })

  return (
    <div>
      <SectionHeader title="Skills & Certifications" description="Technical skills, tools, languages, and credentials." />
      {pending.length > 0 && onSuggestionResolved && (
        <div className="mb-4">
          <PendingSuggestionsPanel
            suggestions={pending}
            onResolved={onSuggestionResolved}
            placement="field"
          />
        </div>
      )}
      <div
        className={cn(
          'space-y-5 rounded-xl transition-colors duration-500',
          acceptedFocus?.section === 'skills' && 'bg-brand-green/5 ring-2 ring-brand-green/15'
        )}
      >
        <Field label="Technical skills"><TagInput tags={s.technical} onChange={technical => setSkills({ technical })} placeholder="TypeScript, Python…" /></Field>
        <Field label="Tools & platforms"><TagInput tags={s.tools} onChange={tools => setSkills({ tools })} placeholder="AWS, Docker, Figma…" /></Field>
        <Field label="Soft skills"><TagInput tags={s.soft} onChange={soft => setSkills({ soft })} placeholder="Leadership, Communication…" /></Field>
        <Field label="Languages"><TagInput tags={s.languages} onChange={languages => setSkills({ languages })} placeholder="English, Spanish…" /></Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">Certifications</label>
            <Button size="sm" variant="ghost" onClick={addCert}><Plus className="w-3.5 h-3.5" />Add</Button>
          </div>
          {certs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No certifications yet.</p>
          ) : (
            <div className="space-y-2">
              {certs.map((c, i) => (
                <div key={i} className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2 items-center">
                  <Input value={c.name} onChange={e => setCert(i, { name: e.target.value })} placeholder="AWS Solutions Architect" />
                  <Input value={c.issuer} onChange={e => setCert(i, { issuer: e.target.value })} placeholder="Amazon" />
                  <Input value={c.date} onChange={e => setCert(i, { date: e.target.value })} placeholder="2024" />
                  <Button variant="ghost" size="icon" onClick={() => removeCert(i)} aria-label="Remove">×</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export function AchievementsSection({ data, update }: { data: ProfileData; update: Update }) {
  const items = data.achievements
  const add = () => {
    const item = { id: uid('ach'), title: '', issuer: '', date: '', description: '' }
    update({ achievements: [item, ...items] })
    focusNewEntry(item.id)
  }
  const setItem = (id: string, patch: Partial<ProfileAchievement>) =>
    update({ achievements: items.map(x => (x.id === id ? { ...x, ...patch } : x)) })
  const remove = (id: string) => update({ achievements: items.filter(x => x.id !== id) })

  return (
    <div>
      <SectionHeader
        title="Achievements"
        description="Awards, honors, publications, and recognitions."
        action={<Button size="sm" onClick={add}><Plus className="w-4 h-4" />Add</Button>}
      />
      {items.length === 0 ? (
        <EmptyState message="No achievements added yet." actionLabel="Add achievement" onAction={add} />
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <EntryCard key={a.id} entryId={a.id} title={a.title || 'New achievement'} subtitle={[a.issuer, a.date].filter(Boolean).join(' · ')} onRemove={() => remove(a.id)} defaultOpen={!a.title}>
              <div className="grid grid-cols-[2fr_1fr] gap-3">
                <Field label="Title"><Input value={a.title} onChange={e => setItem(a.id, { title: e.target.value })} placeholder="Employee of the Year" /></Field>
                <Field label="Date"><Input value={a.date} onChange={e => setItem(a.id, { date: e.target.value })} placeholder="2024" /></Field>
              </div>
              <Field label="Issuer"><Input value={a.issuer} onChange={e => setItem(a.id, { issuer: e.target.value })} placeholder="Acme Inc." /></Field>
              <Field label="Description"><Textarea value={a.description} onChange={e => setItem(a.id, { description: e.target.value })} rows={2} placeholder="What it was for…" /></Field>
            </EntryCard>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Additional (free text)
// ---------------------------------------------------------------------------

export function AdditionalSection({ data, update }: { data: ProfileData; update: Update }) {
  return (
    <div>
      <SectionHeader title="Additional" description="Anything else worth noting — interests, hobbies, or context that is not an application form field." />
      <Textarea value={data.additional} onChange={e => update({ additional: e.target.value })} rows={8} placeholder="Add any extra context here…" />
    </div>
  )
}
