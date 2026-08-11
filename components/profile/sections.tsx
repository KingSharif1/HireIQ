'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, FileText, Star, ExternalLink, Upload, Trash2 } from 'lucide-react'
import { uid } from '@/lib/profile/data'
import type {
  ProfileData,
  ResumeExperience,
  ResumeProject,
  ResumeEducation,
  ProfileVolunteering,
  ProfileAchievement,
  ProfileURL,
  ProfileDocument,
  Resume,
} from '@/types'
import {
  Field,
  SectionHeader,
  EmptyState,
  EntryCard,
  BulletEditor,
  TagInput,
  MonthRange,
} from './primitives'
import { ProvenanceBulletEditor } from './ProvenanceBulletEditor'
import { GitHubConnectPanel } from './GitHubConnectPanel'
import { PendingSuggestionsPanel } from './PendingSuggestionsPanel'
import { MaskedEmailCard } from './MaskedEmailCard'
import { Suspense } from 'react'
import { bulletsWithIds } from '@/lib/profile/bullets'
import { recordBulletEdit, entrySourceLabel } from '@/lib/profile/provenance'

type Update = (patch: Partial<ProfileData>) => void
type ResumeRow = Pick<Resume, 'id' | 'title' | 'ats_format_score' | 'is_primary' | 'created_at' | 'original_file_url'>

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
        <div className="grid grid-cols-2 gap-3">
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" required>
            <Input type="email" value={p.email} onChange={e => set({ email: e.target.value })} placeholder="you@email.com" />
          </Field>
          <Field label="Phone">
            <Input value={p.phone} onChange={e => set({ phone: e.target.value })} placeholder="(555) 123-4567" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location">
            <Input value={p.location} onChange={e => set({ location: e.target.value })} placeholder="City, State" />
          </Field>
          <Field label="Pronouns">
            <Input value={p.pronouns} onChange={e => set({ pronouns: e.target.value })} placeholder="they/them" />
          </Field>
        </div>
      </div>
      <MaskedEmailCard />
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
}: {
  data: ProfileData
  update: Update
  onSuggestionResolved?: (id: string, action: 'accept' | 'decline') => Promise<void>
}) {
  const pending = (data.pendingSuggestions ?? []).filter(s => s.section === 'summary')
  return (
    <div>
      {pending.length > 0 && onSuggestionResolved && (
        <div className="mb-4">
          <PendingSuggestionsPanel suggestions={pending} onResolved={onSuggestionResolved} />
        </div>
      )}
      <SectionHeader title="Summary" description="A 2–4 sentence professional overview. This anchors your tailored resumes." />
      <Textarea
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
  const add = () => update({ urls: [...urls, { id: uid('url'), label: '', url: '' }] })
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
            <div key={u.id} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
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
}: {
  data: ProfileData
  update: Update
  onSuggestionResolved?: (id: string, action: 'accept' | 'decline') => Promise<void>
}) {
  const items = data.experience
  const pending = (data.pendingSuggestions ?? []).filter(s => s.section === 'experience')
  const add = () => {
    const { bullets, bulletIds } = bulletsWithIds([''], undefined, 'bul')
    update({
      experience: [
        ...items,
        {
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
        },
      ],
    })
  }
  const setItem = (id: string, patch: Partial<ResumeExperience>) =>
    update({ experience: items.map(x => (x.id === id ? { ...x, ...patch } : x)) })
  const remove = (id: string) => update({ experience: items.filter(x => x.id !== id) })

  return (
    <div>
      {pending.length > 0 && onSuggestionResolved && (
        <div className="mb-4">
          <PendingSuggestionsPanel suggestions={pending} onResolved={onSuggestionResolved} />
        </div>
      )}
      <SectionHeader
        title="Experience"
        description="Your work history. Lead each bullet with a strong action verb."
        action={<Button size="sm" onClick={add}><Plus className="w-4 h-4" />Add role</Button>}
      />
      {items.length === 0 ? (
        <EmptyState message="No experience added yet." actionLabel="Add role" onAction={add} />
      ) : (
        <div className="space-y-3">
          {items.map(exp => (
            <EntryCard
              key={exp.id}
              title={exp.title || 'New role'}
              subtitle={[exp.company, exp.location].filter(Boolean).join(' · ')}
              sourceLine={entrySourceLabel(data.provenance, exp.bulletIds)}
              onRemove={() => remove(exp.id)}
              defaultOpen={!exp.title}
            >
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
          ))}
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
  const add = () =>
    update({
      volunteering: [
        ...items,
        { id: uid('vol'), organization: '', role: '', location: '', startDate: '', endDate: '', current: false, bullets: [''] },
      ],
    })
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
  onSuggestionResolved,
  onGitHubSynced,
}: {
  data: ProfileData
  update: Update
  githubData?: import('@/lib/github/types').GitHubProfileData | null
  onSuggestionResolved?: (id: string, action: 'accept' | 'decline') => Promise<void>
  onGitHubSynced?: () => void
}) {
  const items = data.projects
  const pending = (data.pendingSuggestions ?? []).filter(s => s.section === 'projects')
  const add = () =>
    update({
      projects: [
        ...items,
        { id: uid('proj'), name: '', description: '', bullets: [''], technologies: [], url: '', github: '' },
      ],
    })
  const setItem = (id: string, patch: Partial<ResumeProject>) =>
    update({ projects: items.map(x => (x.id === id ? { ...x, ...patch } : x)) })
  const remove = (id: string) => update({ projects: items.filter(x => x.id !== id) })

  return (
    <div>
      <Suspense fallback={null}>
        <GitHubConnectPanel initialGithubData={githubData ?? null} onSynced={onGitHubSynced} />
      </Suspense>
      {pending.length > 0 && onSuggestionResolved && (
        <div className="mb-4">
          <PendingSuggestionsPanel suggestions={pending} onResolved={onSuggestionResolved} />
        </div>
      )}
      <SectionHeader
        title="Projects"
        description="Side projects, open source, or notable work products."
        action={<Button size="sm" onClick={add}><Plus className="w-4 h-4" />Add project</Button>}
      />
      {items.length === 0 ? (
        <EmptyState message="No projects added yet." actionLabel="Add project" onAction={add} />
      ) : (
        <div className="space-y-3">
          {items.map(proj => (
            <EntryCard
              key={proj.id}
              title={proj.name || 'New project'}
              subtitle={proj.technologies?.join(', ')}
              sourceLine={
                entrySourceLabel(data.provenance, proj.bulletIds) ??
                (proj.github ? 'From GitHub' : null)
              }
              sourceHref={proj.github || null}
              onRemove={() => remove(proj.id)}
              defaultOpen={!proj.name}
            >
              <Field label="Name"><Input value={proj.name} onChange={e => setItem(proj.id, { name: e.target.value })} placeholder="Project name" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Live URL"><Input value={proj.url} onChange={e => setItem(proj.id, { url: e.target.value })} placeholder="https://…" /></Field>
                <Field label="Repository"><Input value={proj.github} onChange={e => setItem(proj.id, { github: e.target.value })} placeholder="https://github.com/…" /></Field>
              </div>
              <Field label="Technologies">
                <TagInput tags={proj.technologies} onChange={technologies => setItem(proj.id, { technologies })} placeholder="React, Node, Postgres…" />
              </Field>
              <Field label="Highlights">
                <BulletEditor bullets={proj.bullets} onChange={bullets => setItem(proj.id, { bullets })} />
              </Field>
            </EntryCard>
          ))}
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
  const add = () =>
    update({
      education: [
        ...items,
        { id: uid('edu'), institution: '', degree: '', field: '', startDate: '', endDate: '', gpa: '', relevant_courses: [], honors: [] },
      ],
    })
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
            <EntryCard key={edu.id} title={edu.degree || 'New entry'} subtitle={edu.institution} onRemove={() => remove(edu.id)} defaultOpen={!edu.degree}>
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
}: {
  data: ProfileData
  update: Update
  onSuggestionResolved?: (id: string, action: 'accept' | 'decline') => Promise<void>
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
      {pending.length > 0 && onSuggestionResolved && (
        <div className="mb-4">
          <PendingSuggestionsPanel suggestions={pending} onResolved={onSuggestionResolved} />
        </div>
      )}
      <SectionHeader title="Skills & Certifications" description="Technical skills, tools, languages, and credentials." />
      <div className="space-y-5">
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
  const add = () => update({ achievements: [...items, { id: uid('ach'), title: '', issuer: '', date: '', description: '' }] })
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
            <EntryCard key={a.id} title={a.title || 'New achievement'} subtitle={[a.issuer, a.date].filter(Boolean).join(' · ')} onRemove={() => remove(a.id)} defaultOpen={!a.title}>
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
      <SectionHeader title="Additional" description="Anything else worth noting — interests, availability, work authorization, etc." />
      <Textarea value={data.additional} onChange={e => update({ additional: e.target.value })} rows={8} placeholder="Add any extra context here…" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Documents: Additional Documents & Attachments (link/note lists)
// ---------------------------------------------------------------------------

function DocumentList({
  title,
  description,
  docs,
  onChange,
}: {
  title: string
  description: string
  docs: ProfileDocument[]
  onChange: (next: ProfileDocument[]) => void
}) {
  const add = () => onChange([...docs, { id: uid('doc'), name: '', url: '', note: '' }])
  const setItem = (id: string, patch: Partial<ProfileDocument>) =>
    onChange(docs.map(d => (d.id === id ? { ...d, ...patch } : d)))
  const remove = (id: string) => onChange(docs.filter(d => d.id !== id))

  return (
    <div>
      <SectionHeader title={title} description={description} action={<Button size="sm" onClick={add}><Plus className="w-4 h-4" />Add</Button>} />
      {docs.length === 0 ? (
        <EmptyState message="Nothing here yet." actionLabel="Add link" onAction={add} />
      ) : (
        <div className="space-y-3">
          {docs.map(d => (
            <EntryCard key={d.id} title={d.name || 'New document'} subtitle={d.url} onRemove={() => remove(d.id)} defaultOpen={!d.name}>
              <Field label="Name"><Input value={d.name} onChange={e => setItem(d.id, { name: e.target.value })} placeholder="Transcript, reference letter…" /></Field>
              <Field label="Link"><Input value={d.url} onChange={e => setItem(d.id, { url: e.target.value })} placeholder="https://…" /></Field>
              <Field label="Note"><Input value={d.note} onChange={e => setItem(d.id, { note: e.target.value })} placeholder="Optional note" /></Field>
            </EntryCard>
          ))}
        </div>
      )}
    </div>
  )
}

export function AdditionalDocumentsSection({ data, update }: { data: ProfileData; update: Update }) {
  return (
    <DocumentList
      title="Additional Documents"
      description="Transcripts, references, certifications, or portfolios you may want to attach."
      docs={data.additionalDocuments}
      onChange={additionalDocuments => update({ additionalDocuments })}
    />
  )
}

export function AttachmentsSection({ data, update }: { data: ProfileData; update: Update }) {
  return (
    <DocumentList
      title="Attachments"
      description="Other files or links to keep handy for applications."
      docs={data.attachments}
      onChange={attachments => update({ attachments })}
    />
  )
}

// ---------------------------------------------------------------------------
// Resumes (read from DB, managed on dedicated pages)
// ---------------------------------------------------------------------------

export function ResumesSection({ resumes }: { resumes: ResumeRow[] }) {
  return (
    <div>
      <SectionHeader
        title="Resumes"
        description="Uploads that seed your master profile. Manage them right here — view the original, replace, or delete."
        action={
          <Button size="sm" asChild>
            <Link href="/dashboard/resume/upload"><Upload className="w-4 h-4" />Upload</Link>
          </Button>
        }
      />
      {resumes.length === 0 ? (
        <EmptyState message="No resumes uploaded yet." actionLabel="Upload resume" onAction={() => { window.location.href = '/dashboard/resume/upload' }} />
      ) : (
        <div className="space-y-3">
          {resumes.map(r => (
            <ResumeRowCard key={r.id} resume={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function ResumeRowCard({ resume }: { resume: ResumeRow }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function handleDelete() {
    if (!confirm) {
      setConfirm(true)
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/resume/${resume.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(json.error || 'Delete failed')
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete resume')
      setConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="hover:border-brand-purple/40 transition-colors group">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-brand-purple" />
        </div>
        <Link href={`/dashboard/resume/${resume.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-foreground truncate">{resume.title}</p>
            {resume.is_primary && <Star className="w-3.5 h-3.5 text-brand-amber fill-brand-amber" />}
          </div>
          {resume.ats_format_score != null && (
            <p className="text-xs text-muted-foreground">Format score: {resume.ats_format_score}%</p>
          )}
        </Link>

        <div className="flex items-center gap-1 flex-shrink-0">
          {resume.original_file_url && (
            <Button variant="ghost" size="sm" asChild title="View original upload">
              <a href={resume.original_file_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild title="Replace / upload new">
            <Link href="/dashboard/resume/upload"><Upload className="w-4 h-4" /></Link>
          </Button>
          <Button
            type="button"
            variant={confirm ? 'destructive' : 'ghost'}
            size="sm"
            disabled={deleting}
            onClick={() => void handleDelete()}
            onBlur={() => setConfirm(false)}
            title="Delete resume"
          >
            <Trash2 className="w-4 h-4" />
            {confirm ? 'Confirm' : ''}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
