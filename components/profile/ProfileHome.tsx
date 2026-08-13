'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useProfileSave } from '@/components/profile/useProfileSave'
import { ProfileSectionNav } from '@/components/profile/ProfileSectionNav'
import { ProfileSectionStack, type ResumeRow } from '@/components/profile/ProfileSectionPanel'
import {
  SECTION_GROUPS,
  SECTIONS,
  isKnownSection,
  profileSectionAnchor,
  type SectionId,
} from '@/lib/profile/sections'
import type { Profile, ProfileData } from '@/types'
import type { GitHubProfileData } from '@/lib/github/types'

interface ProfileHomeProps {
  userId: string
  initialData: ProfileData
  profile: Profile | null
  resumes: ResumeRow[]
  githubData: GitHubProfileData | null
  /** When true, omit the page title — Resume Builder already provides chrome. */
  embedded?: boolean
}

const DEFAULT_SECTION: SectionId = 'personal'

function resolveInitialSection(param: string | null): SectionId {
  if (param && isKnownSection(param)) return param
  return DEFAULT_SECTION
}

/**
 * Profile = master resume. All sections on one scrolling page; nav jumps to anchors.
 * Pending accept/deny live on the section they belong to.
 */
export function ProfileHome({
  userId,
  initialData,
  profile,
  resumes,
  githubData,
  embedded = false,
}: ProfileHomeProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
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

  const sectionFromUrl = useMemo(() => resolveInitialSection(sectionParam), [sectionParam])
  const [manualActive, setManualActive] = useState<SectionId | null>(null)
  const active = manualActive ?? sectionFromUrl
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const skipUrlScrollRef = useRef(false)

  useEffect(() => {
    if (skipUrlScrollRef.current) {
      skipUrlScrollRef.current = false
      return
    }
    if (!sectionParam || !isKnownSection(sectionParam)) return
    const frame = requestAnimationFrame(() => {
      document.getElementById(profileSectionAnchor(sectionParam))?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [sectionParam])

  useEffect(() => {
    const root = scrollRootRef.current
    if (!root) return
    const nodes = SECTIONS.map(section =>
      document.getElementById(profileSectionAnchor(section.id)),
    ).filter((node): node is HTMLElement => Boolean(node))
    const observer = new IntersectionObserver(
      entries => {
        const hit = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!hit) return
        const id = hit.target.id.replace(/^section-/, '')
        if (isKnownSection(id)) setManualActive(id)
      },
      { root, rootMargin: '-12% 0px -70% 0px', threshold: [0.15, 0.35, 0.6] },
    )
    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function selectSection(id: SectionId) {
    skipUrlScrollRef.current = true
    setManualActive(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('section', id)
    if (pathname.startsWith('/dashboard/builder')) {
      params.set('view', 'master')
    }
    const href = pathname.startsWith('/dashboard/builder')
      ? `/dashboard/builder?${params.toString()}`
      : `?${params.toString()}`
    router.replace(href, { scroll: false })
    requestAnimationFrame(() => {
      document.getElementById(profileSectionAnchor(id))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  return (
    <div className={cn('flex flex-col bg-white dark:bg-background', embedded ? 'flex-1 min-h-0' : 'min-h-dvh')}>
      <header className="sticky top-0 z-20 border-b border-border bg-white dark:bg-background">
        <div className="flex items-center justify-between gap-3 px-3 md:px-4 py-2.5">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              {embedded ? 'Edit sections' : 'Master resume'}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              All sections on one page — jump from the left, then Save
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saved && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-brand-green">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            {dirty && !saving && (
              <span className="hidden sm:inline text-xs text-muted-foreground">Unsaved</span>
            )}
            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              size="sm"
              variant="outline"
              className="h-8"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        <ProfileSectionNav
          data={data}
          resumeCount={resumes.length}
          active={active}
          onSelect={selectSection}
          groups={SECTION_GROUPS}
          emailFallback={profile?.email}
          stickyClassName="lg:sticky lg:top-[57px]"
          hint="Jump to a section — everything is on this page."
        />

        <div ref={scrollRootRef} className="flex-1 min-w-0 overflow-auto p-4 md:p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <ProfileSectionStack
            data={data}
            update={update}
            resumes={resumes}
            githubData={githubData}
            onSuggestionResolved={handleSuggestionResolved}
            onGitHubSynced={() => router.refresh()}
          />
        </div>
      </div>
    </div>
  )
}
