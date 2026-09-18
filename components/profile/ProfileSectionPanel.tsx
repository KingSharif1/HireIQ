'use client'

import type { ProfileData } from '@/types'
import type { GitHubProfileData, RepoIntelligenceRecord } from '@/lib/github/types'
import type { ResumeTheme } from '@/lib/export/theme'
import type { AcceptedSuggestionFocus } from '@/lib/profile/suggestion-focus'
import { SECTIONS, profileSectionAnchor, type SectionId } from '@/lib/profile/sections'
import type { ResumeRow } from '@/lib/profile/resume-row'
import { ResumesSection } from '@/components/profile/ResumesSection'
import { AdditionalDocumentsSection } from '@/components/profile/AdditionalDocumentsSection'
import {
  PersonalSection,
  ApplyAnswersSection,
  SummarySection,
  UrlsSection,
  ExperienceSection,
  VolunteeringSection,
  ProjectsSection,
  EducationSection,
  SkillsSection,
  AchievementsSection,
  AdditionalSection,
} from './sections'

export type { ResumeRow } from '@/lib/profile/resume-row'

export type ProfileSectionContentProps = {
  data: ProfileData
  update: (patch: Partial<ProfileData>) => void
  resumes: ResumeRow[]
  githubData: GitHubProfileData | null
  repoIntelligence?: Record<number, RepoIntelligenceRecord>
  onSuggestionResolved: (
    id: string,
    action: 'accept' | 'decline',
    enrichment?: import('@/lib/profile/suggestion-followup').SuggestionEnrichment
  ) => Promise<void>
  onGitHubSynced: () => void
  acceptedFocus?: AcceptedSuggestionFocus | null
  /** Saved designer theme — used as defaults for master PDF export. */
  savedTheme?: ResumeTheme | null
}

export function renderProfileSection(id: SectionId, props: ProfileSectionContentProps) {
  const {
    data,
    update,
    resumes,
    githubData,
    repoIntelligence,
    onSuggestionResolved,
    onGitHubSynced,
    acceptedFocus,
    savedTheme,
  } = props
  switch (id) {
    case 'personal':
      return <PersonalSection data={data} update={update} />
    case 'applyAnswers':
      return <ApplyAnswersSection data={data} update={update} />
    case 'resumes':
      return <ResumesSection resumes={resumes} data={data} savedTheme={savedTheme} />
    case 'additionalDocuments':
      return <AdditionalDocumentsSection data={data} update={update} />
    case 'summary':
      return (
        <SummarySection
          data={data}
          update={update}
          onSuggestionResolved={onSuggestionResolved}
          acceptedFocus={acceptedFocus}
        />
      )
    case 'urls':
      return <UrlsSection data={data} update={update} />
    case 'experience':
      return (
        <ExperienceSection
          data={data}
          update={update}
          onSuggestionResolved={onSuggestionResolved}
          acceptedFocus={acceptedFocus}
        />
      )
    case 'volunteering':
      return <VolunteeringSection data={data} update={update} />
    case 'projects':
      return (
        <ProjectsSection
          data={data}
          update={update}
          githubData={githubData}
          repoIntelligence={repoIntelligence}
          onSuggestionResolved={onSuggestionResolved}
          onGitHubSynced={onGitHubSynced}
          acceptedFocus={acceptedFocus}
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
          acceptedFocus={acceptedFocus}
        />
      )
    case 'achievements':
      return <AchievementsSection data={data} update={update} />
    case 'additional':
      return <AdditionalSection data={data} update={update} />
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
