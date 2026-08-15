'use client'

import { ResumeLibrary, type LibraryTailoredRow } from '@/components/builder/ResumeLibrary'
import type { ResumeRow } from '@/lib/profile/resume-row'

type BuilderHomeProps = {
  libraryResumes: ResumeRow[]
  tailored: LibraryTailoredRow[]
}

export function BuilderHome({ libraryResumes, tailored }: BuilderHomeProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-white dark:bg-background">
      <div className="border-b border-border px-3 py-3 md:px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Resume Builder
        </p>
        <h1 className="mt-1 text-base font-semibold text-foreground">Files & versions</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Uploads plus tailored resumes grouped by job. Edit your master in Profile.
        </p>
      </div>
      <ResumeLibrary resumes={libraryResumes} tailored={tailored} />
    </div>
  )
}
