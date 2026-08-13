'use client'

import type { ProfileData } from '@/types'
import type { GitHubProfileData } from '@/lib/github/types'
import { SECTIONS, profileSectionAnchor, type SectionId } from '@/lib/profile/sections'
import type { ResumeRow } from '@/lib/profile/resume-row'
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

export type { ResumeRow } from '@/lib/profile/resume-row'

export type ProfileSectionContentProps = {
  data: ProfileData
  update: (patch: Partial<ProfileData>) => void
  resumes: ResumeRow[]
  githubData: GitHubProfileData | null
  onSuggestionResolved: (
    id: string,
    action: 'accept' | 'decline',
    enrichment?: import('@/lib/profile/suggestion-followup').SuggestionEnrichment
  ) => Promise<void>
  onGitHubSynced: () => void
}

export function renderProfileSection(id: SectionId, props: ProfileSectionContentProps) {
  const { data, update, resumes, githubData, onSuggestionResolved, onGitHubSynced } = props
  switch (id) {
    case 'personal':
      return <PersonalSection data={data} update={update} />
    case 'resumes':
      return <ResumesSection resumes={resumes} />
    case 'additionalDocuments':
      return <AdditionalDocumentsSection data={data} update={update} />
    case 'summary':
      return (
        <SummarySection
          data={data}
          update={update}
          onSuggestionResolved={onSuggestionResolved}
        />
      )
    case 'urls':
      return <UrlsSection data={data} update={update} />
    case 'experience':
      return <ExperienceSection data={data} update={update} onSuggestionResolved={onSuggestionResolved} />
    case 'volunteering':
      return <VolunteeringSection data={data} update={update} />
    case 'projects':
      return (
        <ProjectsSection
          data={data}
          update={update}
          githubData={githubData}
          onSuggestionResolved={onSuggestionResolved}
          onGitHubSynced={onGitHubSynced}
        />
      )
    case 'education':
      return <EducationSection data={data} update={update} />
    case 'skills':
      return (
        <SkillsSection
          data={data}
          update={update}
          onSuggestionResolved={onSuggestionResolved}
        />
      )
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

export function ProfileSectionPanel({
  active,
  ...props
}: ProfileSectionContentProps & { active: SectionId }) {
  return renderProfileSection(active, props)
}

/** All master sections on one page — left nav jumps to anchors. */
export function ProfileSectionStack(props: ProfileSectionContentProps) {
  return (
    <div className="space-y-10 pb-16">
      {SECTIONS.map(section => (
        <section
          key={section.id}
          id={profileSectionAnchor(section.id)}
          className="scroll-mt-20 border-b border-border/70 pb-10 last:border-b-0 last:pb-0"
        >
          {renderProfileSection(section.id, props)}
        </section>
      ))}
    </div>
  )
}
