'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Check, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import {
  SECTIONS,
  SECTION_GROUPS,
  sectionCount,
  sectionComplete,
  profileCompleteness,
  type SectionId,
} from '@/lib/profile/sections'
import type { ProfileData, Profile, Resume } from '@/types'
import { normalizeProfileData, pendingCountForSection } from '@/lib/profile/provenance'
import {
  PersonalSection,
  SummarySection,
  UrlsSection,
  ExperienceSection,
  VolunteeringSection,
  ProjectsSection,
  EducationSection,
  SkillsSection,
  AchievementsSection,
  AdditionalSection,
  AdditionalDocumentsSection,
  AttachmentsSection,
  ResumesSection,
} from './sections'

type ResumeRow = Pick<Resume, 'id' | 'title' | 'ats_format_score' | 'is_primary' | 'created_at' | 'original_file_url'>

interface Props {
  userId: string
  initialData: ProfileData
  profile: Profile | null
  resumes: ResumeRow[]
}

export function ProfileWorkspace({ userId, initialData, profile, resumes }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get('section')
  const sectionFromUrl = useMemo(
    () =>
      sectionParam && SECTIONS.some(s => s.id === sectionParam)
        ? (sectionParam as SectionId)
        : null,
    [sectionParam]
  )

  const [data, setData] = useState<ProfileData>(() => normalizeProfileData(initialData))
  const [manualActive, setManualActive] = useState<SectionId | null>(null)
  const active = sectionFromUrl ?? manualActive ?? 'personal'
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (patch: Partial<ProfileData>) => {
    setData(prev => ({ ...prev, ...patch }))
    setDirty(true)
    setSaved(false)
  }

  const completeness = useMemo(() => profileCompleteness(data, resumes.length), [data, resumes.length])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('profiles')
      .update({
        profile_data: data,
        first_name: data.personal.firstName.trim() || profile?.first_name || null,
        last_name: data.personal.lastName.trim() || profile?.last_name || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (err) {
      setError(err.message)
    } else {
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function handleSuggestionResolved(suggestionId: string, action: 'accept' | 'decline') {
    const res = await fetch('/api/profile/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, suggestionId }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed')
    setData(normalizeProfileData(json.profileData))
    setDirty(false)
    router.refresh()
  }

  const fullName = [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ') || 'Your Profile'
  const initials =
    `${data.personal.firstName?.[0] ?? ''}${data.personal.lastName?.[0] ?? ''}`.toUpperCase() || '?'

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto px-4 py-6">
      {/* Inner section nav */}
      <aside className="lg:w-64 flex-shrink-0">
        <div className="lg:sticky lg:top-6 space-y-5">
          {/* Identity + completeness */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center text-sm font-bold text-brand-purple flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{data.personal.email || profile?.email}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Profile completeness</span>
                <span className="font-semibold text-foreground">{completeness}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', completeness === 100 ? 'bg-brand-green' : 'bg-brand-purple')}
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
          </div>

          {/* Grouped nav */}
          <nav className="space-y-5">
            {SECTION_GROUPS.map(group => (
              <div key={group}>
                <p className="px-3 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {SECTIONS.filter(s => s.group === group).map(section => {
                    const Icon = section.icon
                    const count = sectionCount(section.id, data, resumes.length)
                    const pending = section.id === 'experience'
                      ? pendingCountForSection(data, 'experience')
                      : 0
                    const complete = sectionComplete(section.id, data, resumes.length)
                    const isActive = active === section.id
                    return (
                      <button
                        key={section.id}
                        onClick={() => setManualActive(section.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                          isActive
                            ? 'bg-brand-purple/15 text-brand-purple font-medium'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{section.label}</span>
                        {pending > 0 ? (
                          <Badge className="px-1.5 py-0 text-[10px] min-w-[1.25rem] justify-center bg-brand-amber/20 text-brand-amber border-brand-amber/30">
                            {pending}
                          </Badge>
                        ) : count != null && count > 0 ? (
                          <Badge variant={isActive ? 'default' : 'muted'} className="px-1.5 py-0 text-[10px] min-w-[1.25rem] justify-center">
                            {count}
                          </Badge>
                        ) : complete ? (
                          <Check className="w-3.5 h-3.5 text-brand-green" />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 min-w-0">
        {/* Sticky review/save bar */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 mb-5 bg-background/80 backdrop-blur border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {completeness === 100 ? (
              <span className="flex items-center gap-1.5 text-brand-green">
                <CheckCircle2 className="w-4 h-4" /> Profile ready
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="w-4 h-4 text-brand-amber" />
                {completeness}% complete — finish key sections to improve tailoring
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-brand-green">
                <Check className="w-4 h-4" /> Saved
              </span>
            )}
            {dirty && !saving && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
            <Button onClick={handleSave} disabled={!dirty || saving} size="sm" className="min-w-[110px]">
              {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>) : 'Save changes'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6">
          <SectionPanel
            active={active}
            data={data}
            update={update}
            resumes={resumes}
            onSuggestionResolved={handleSuggestionResolved}
          />
        </div>
      </div>
    </div>
  )
}

function SectionPanel({
  active,
  data,
  update,
  resumes,
  onSuggestionResolved,
}: {
  active: SectionId
  data: ProfileData
  update: (patch: Partial<ProfileData>) => void
  resumes: ResumeRow[]
  onSuggestionResolved: (id: string, action: 'accept' | 'decline') => Promise<void>
}) {
  switch (active) {
    case 'personal':
      return <PersonalSection data={data} update={update} />
    case 'resumes':
      return <ResumesSection resumes={resumes} />
    case 'additionalDocuments':
      return <AdditionalDocumentsSection data={data} update={update} />
    case 'summary':
      return <SummarySection data={data} update={update} />
    case 'urls':
      return <UrlsSection data={data} update={update} />
    case 'experience':
      return <ExperienceSection data={data} update={update} onSuggestionResolved={onSuggestionResolved} />
    case 'volunteering':
      return <VolunteeringSection data={data} update={update} />
    case 'projects':
      return <ProjectsSection data={data} update={update} />
    case 'education':
      return <EducationSection data={data} update={update} />
    case 'skills':
      return <SkillsSection data={data} update={update} />
    case 'achievements':
      return <AchievementsSection data={data} update={update} />
    case 'additional':
      return <AdditionalSection data={data} update={update} />
    case 'attachments':
      return <AttachmentsSection data={data} update={update} />
    default:
      return null
  }
}
