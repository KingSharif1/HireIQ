'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ResumeLibrary, type LibraryTailoredRow } from '@/components/builder/ResumeLibrary'
import { ProfileHome } from '@/components/profile/ProfileHome'
import type { ResumeRow } from '@/lib/profile/resume-row'
import type { Profile, ProfileData } from '@/types'
import type { GitHubProfileData } from '@/lib/github/types'

export type BuilderView = 'master' | 'files'

type BuilderHomeProps = {
  view: BuilderView
  userId: string
  initialData: ProfileData
  profile: Profile | null
  resumes: ResumeRow[]
  githubData: GitHubProfileData | null
  libraryResumes: ResumeRow[]
  tailored: LibraryTailoredRow[]
}

const VIEWS: { id: BuilderView; label: string; hint: string }[] = [
  { id: 'master', label: 'Master resume', hint: 'All sections on one page — used for tailoring and autofill' },
  { id: 'files', label: 'Files & versions', hint: 'Uploads and per-job tailored copies' },
]

export function BuilderHome({
  view,
  userId,
  initialData,
  profile,
  resumes,
  githubData,
  libraryResumes,
  tailored,
}: BuilderHomeProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setView(next: BuilderView) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', next)
    if (next === 'files') params.delete('section')
    router.replace(`/dashboard/builder?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white dark:bg-background">
      <div className="border-b border-border px-3 py-3 md:px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Resume Builder
        </p>
        <div
          role="tablist"
          aria-label="Resume Builder views"
          className="mt-2 flex flex-wrap gap-1 rounded-lg border border-border bg-secondary/30 p-1"
        >
          {VIEWS.map(item => {
            const selected = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setView(item.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors',
                  selected
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {VIEWS.find(item => item.id === view)?.hint}
        </p>
      </div>

      {view === 'master' ? (
        <ProfileHome
          userId={userId}
          initialData={initialData}
          profile={profile}
          resumes={resumes}
          githubData={githubData}
          embedded
        />
      ) : (
        <ResumeLibrary resumes={libraryResumes} tailored={tailored} />
      )}
    </div>
  )
}
