'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useProfileSave } from '@/components/profile/useProfileSave'
import { ProfileSectionNav } from '@/components/profile/ProfileSectionNav'
import { ProfileSectionPanel, type ResumeRow } from '@/components/profile/ProfileSectionPanel'
import {
  SECTION_GROUPS,
  SECTIONS,
  isKnownSection,
  type SectionId,
} from '@/lib/profile/sections'
import { profilePath } from '@/lib/profile/paths'
import type { Profile, ProfileData } from '@/types'
import type { GitHubProfileData } from '@/lib/github/types'

interface ProfileHomeProps {
  userId: string
  initialData: ProfileData
  profile: Profile | null
  resumes: ResumeRow[]
  githubData: GitHubProfileData | null
}

const DEFAULT_SECTION: SectionId = 'personal'

function resolveInitialSection(param: string | null): SectionId {
  if (param && isKnownSection(param)) return param
  return DEFAULT_SECTION
}

/**
 * Profile = master resume + autofill identity.
 * Left nav shows one section at a time (Sprout-style).
 */
export function ProfileHome({
  userId,
  initialData,
  profile,
  resumes,
  githubData,
}: ProfileHomeProps) {
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get('section')

  const {
    data,
    update,
    dirty,
    saving,
    saved,
    error,
    handleSave,
    handleSuggestionResolved,
    router,
  } = useProfileSave({ userId, initialData, profile })

  const active = useMemo(() => resolveInitialSection(sectionParam), [sectionParam])
  const activeDef = SECTIONS.find(s => s.id === active)

  function selectSection(id: SectionId) {
    const extra: Record<string, string> = {}
    const githubError = searchParams.get('github_error')
    const googleError = searchParams.get('google_error')
    if (githubError) extra.github_error = githubError
    if (googleError) extra.google_error = googleError
    const href = profilePath(id, extra)
    router.replace(href, { scroll: false })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white dark:bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-white dark:bg-background">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 md:px-4">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-foreground">Profile</h1>
            <p className="truncate text-xs text-muted-foreground">
              {activeDef?.label ?? 'Personal Info'} — used for tailoring, autofill, and apply
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {saved && (
              <span className="hidden items-center gap-1 text-xs text-brand-green sm:flex">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            {dirty && !saving && (
              <span className="hidden text-xs text-muted-foreground sm:inline">Unsaved</span>
            )}
            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              size="sm"
              variant="outline"
              className="h-8"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ProfileSectionNav
          data={data}
          resumeCount={resumes.length}
          active={active}
          onSelect={selectSection}
          groups={SECTION_GROUPS}
          emailFallback={profile?.email}
          stickyClassName="lg:sticky lg:top-[57px]"
          hint="Open one section at a time."
        />

        <div className="min-w-0 flex-1 overflow-auto p-3 md:p-6">
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <div className={cn('pb-16')}>
            <ProfileSectionPanel
              active={active}
              data={data}
              update={update}
              resumes={resumes}
              githubData={githubData}
              onSuggestionResolved={handleSuggestionResolved}
              onGitHubSynced={() => router.refresh()}
              savedTheme={profile?.resume_theme ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
