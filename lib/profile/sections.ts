import type { ProfileData } from '@/types'
import {
  User,
  FileText,
  Files,
  AlignLeft,
  Link2,
  Briefcase,
  HeartHandshake,
  FolderGit2,
  GraduationCap,
  Zap,
  Award,
  Plus,
  Paperclip,
  type LucideIcon,
} from 'lucide-react'

export type SectionId =
  | 'personal'
  | 'resumes'
  | 'additionalDocuments'
  | 'summary'
  | 'urls'
  | 'experience'
  | 'volunteering'
  | 'projects'
  | 'education'
  | 'skills'
  | 'achievements'
  | 'additional'
  | 'attachments'

export type SectionGroup = 'PROFILE' | 'DOCUMENTS' | 'PROFESSIONAL PROFILE'

export interface SectionDef {
  id: SectionId
  label: string
  group: SectionGroup
  icon: LucideIcon
  /** Whether the count badge is a list length (number) or a filled flag (dot). */
  kind: 'list' | 'text' | 'static'
}

export const SECTIONS: SectionDef[] = [
  { id: 'personal', label: 'Personal Info', group: 'PROFILE', icon: User, kind: 'text' },

  { id: 'resumes', label: 'Resumes', group: 'DOCUMENTS', icon: FileText, kind: 'static' },
  { id: 'additionalDocuments', label: 'Additional Documents', group: 'DOCUMENTS', icon: Files, kind: 'list' },
  { id: 'attachments', label: 'Attachments', group: 'DOCUMENTS', icon: Paperclip, kind: 'list' },

  { id: 'summary', label: 'Summary', group: 'PROFESSIONAL PROFILE', icon: AlignLeft, kind: 'text' },
  { id: 'urls', label: 'URLs', group: 'PROFESSIONAL PROFILE', icon: Link2, kind: 'list' },
  { id: 'experience', label: 'Experience', group: 'PROFESSIONAL PROFILE', icon: Briefcase, kind: 'list' },
  { id: 'volunteering', label: 'Volunteering', group: 'PROFESSIONAL PROFILE', icon: HeartHandshake, kind: 'list' },
  { id: 'projects', label: 'Projects', group: 'PROFESSIONAL PROFILE', icon: FolderGit2, kind: 'list' },
  { id: 'education', label: 'Education', group: 'PROFESSIONAL PROFILE', icon: GraduationCap, kind: 'list' },
  { id: 'skills', label: 'Skills & Certs', group: 'PROFESSIONAL PROFILE', icon: Zap, kind: 'list' },
  { id: 'achievements', label: 'Achievements', group: 'PROFESSIONAL PROFILE', icon: Award, kind: 'list' },
  { id: 'additional', label: 'Additional', group: 'PROFESSIONAL PROFILE', icon: Plus, kind: 'text' },
]

export const SECTION_GROUPS: SectionGroup[] = ['PROFILE', 'DOCUMENTS', 'PROFESSIONAL PROFILE']

/** Groups shown on Professional Profile (Sprout) — no Documents. */
export const PROFESSIONAL_GROUPS: SectionGroup[] = ['PROFILE', 'PROFESSIONAL PROFILE']

/** Document vault sections (uploaded resumes + link lists). */
export const DOCUMENT_SECTION_IDS: SectionId[] = [
  'resumes',
  'additionalDocuments',
  'attachments',
]

export function isDocumentSection(id: string): id is SectionId {
  return (DOCUMENT_SECTION_IDS as string[]).includes(id)
}

export function isKnownSection(id: string): id is SectionId {
  return SECTIONS.some(s => s.id === id)
}

/** DOM id for Master resume section anchors (one-page scroll). */
export function profileSectionAnchor(id: SectionId): string {
  return `section-${id}`
}

/** Count badge value for a section. Returns a number for lists, or null. */
export function sectionCount(id: SectionId, data: ProfileData, resumeCount: number): number | null {
  switch (id) {
    case 'resumes':
      return resumeCount
    case 'additionalDocuments':
      return data.additionalDocuments.length
    case 'urls':
      return data.urls.length
    case 'experience':
      return data.experience.length
    case 'volunteering':
      return data.volunteering.length
    case 'projects':
      return data.projects.length
    case 'education':
      return data.education.length
    case 'skills':
      return (
        data.skills.technical.length +
        data.skills.tools.length +
        data.skills.languages.length +
        data.skills.soft.length +
        data.certifications.length
      )
    case 'achievements':
      return data.achievements.length
    case 'attachments':
      return data.attachments.length
    default:
      return null
  }
}

/** Whether a text/profile section is considered "complete" (for review status). */
export function sectionComplete(id: SectionId, data: ProfileData, resumeCount: number): boolean {
  switch (id) {
    case 'personal':
      return Boolean(data.personal.firstName && data.personal.lastName && data.personal.email)
    case 'summary':
      return data.summary.trim().length > 0
    case 'additional':
      return data.additional.trim().length > 0
    case 'resumes':
      return resumeCount > 0
    default: {
      const c = sectionCount(id, data, resumeCount)
      return (c ?? 0) > 0
    }
  }
}

/** Sections that count toward the completeness meter. */
const REVIEW_SECTIONS: SectionId[] = [
  'personal',
  'resumes',
  'summary',
  'experience',
  'education',
  'skills',
]

export function profileCompleteness(data: ProfileData, resumeCount: number): number {
  const done = REVIEW_SECTIONS.filter(id => sectionComplete(id, data, resumeCount)).length
  return Math.round((done / REVIEW_SECTIONS.length) * 100)
}
