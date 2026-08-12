'use client'

import type { ProfileData } from '@/types'
import type { GitHubProfileData } from '@/lib/github/types'
import type { SectionId } from '@/lib/profile/sections'
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

export function ProfileSectionPanel({
  active,
  data,
  update,
  resumes,
  githubData,
  onSuggestionResolved,
  onGitHubSynced,
}: {
  active: SectionId
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
}) {
  switch (active) {
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
