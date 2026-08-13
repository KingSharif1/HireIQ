import type { GitHubProfileData } from '@/lib/github/types'
import type { ResumeTheme, ResumeThemeOverride } from '@/lib/export/theme'

export interface ResumeContact {
  name: string
  email: string
  phone: string
  location: string
  linkedin: string
  github: string
  portfolio: string
  website: string
}

export interface ResumeExperience {
  id: string
  company: string
  title: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  bullets: string[]
  /** Stable ids parallel to `bullets` — keys into profile_data.provenance */
  bulletIds?: string[]
  skills_used: string[]
}

export interface ResumeEducation {
  id: string
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  gpa: string
  relevant_courses: string[]
  honors: string[]
}

export interface ResumeSkills {
  technical: string[]
  soft: string[]
  tools: string[]
  languages: string[]
}

export interface ResumeProject {
  id: string
  name: string
  description: string
  bullets: string[]
  bulletIds?: string[]
  technologies: string[]
  url: string
  github: string
  /** Where this project first entered the profile. */
  source?: 'manual' | 'github' | 'resume'
}

export interface ResumeCertification {
  name: string
  issuer: string
  date: string
  url: string
}

export interface TailoringNote {
  section: string
  change: string
  reason: string
}

export interface StructuredResume {
  contact: ResumeContact
  summary: string
  experience: ResumeExperience[]
  education: ResumeEducation[]
  skills: ResumeSkills
  projects: ResumeProject[]
  certifications: ResumeCertification[]
  volunteer: unknown[]
  awards: unknown[]
  tailoring_notes?: TailoringNote[]
}

export interface JobExtractedData {
  title: string
  company: string
  required_skills: string[]
  preferred_skills: string[]
  required_experience_years: number
  education_requirement: string
  keywords: string[]
  responsibilities: string[]
  ats_system: string
  red_flags: string[]
  company_values: string[]
  compensation: {
    min: number | null
    max: number | null
    currency: string
    period: string
  }
  work_type: string
  seniority: string
  summary: string
}

export interface ATSScoreBreakdown {
  keywords: number
  skills: number
  experience: number
  format: number
  education: number
}

export interface ATSScore {
  total: number
  breakdown: ATSScoreBreakdown
  matched_keywords: string[]
  missing_keywords: string[]
  matched_skills: string[]
  missing_skills: string[]
  recommendations: string[]
}

export interface GapQuestion {
  id: string
  question: string
  category: 'experience' | 'skills' | 'projects' | 'education' | 'achievement'
  gap_being_filled: string
  why_it_matters: string
  example_answer: string
  /** AI-suggested quick answers the user can pick instead of typing (hybrid Q&A). */
  choices?: string[]
}

export interface DirectMatch {
  jd_requirement: string
  user_evidence: string
  source: string
}

export interface AdjacentMatch {
  jd_requirement: string
  user_evidence: string
  honest_framing: string
}

export interface RealGap {
  jd_requirement: string
  note: string
}

export interface GapAnalysis {
  direct_matches: DirectMatch[]
  adjacent_matches: AdjacentMatch[]
  real_gaps: RealGap[]
  questions_for_user: GapQuestion[]
}

export interface CoverLetterResult {
  subject_line: string
  cover_letter: string
  keywords_used: string[]
  word_count: number
  tone: 'professional' | 'conversational' | 'enthusiastic'
}

export interface ResumeDiffChange {
  id?: string
  section: string
  field: string
  expId?: string
  projId?: string
  before: string | string[]
  after: string | string[]
  changeType?: 'added' | 'changed' | 'removed' | 'reordered' | 'rephrased'
  reason?: string
}

export type ChangeDecisionStatus = 'pending' | 'accepted' | 'declined' | 'edited'

export type DeclineReasonCode =
  | 'not_accurate'
  | 'too_strong'
  | 'prefer_original'
  | 'not_relevant'
  | 'other'

export interface ChangeDecision {
  status: ChangeDecisionStatus
  declineReason?: string
  declineReasonCode?: DeclineReasonCode
  editedValue?: string | string[]
}

// ---------------------------------------------------------------------------
// Structured profile (Sprout-style sectioned profile)
// ---------------------------------------------------------------------------

export interface ProfilePersonalInfo {
  firstName: string
  lastName: string
  headline: string
  email: string
  phone: string
  location: string
  pronouns: string
}

export interface ProfileURL {
  id: string
  label: string
  url: string
}

export interface ProfileVolunteering {
  id: string
  organization: string
  role: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  bullets: string[]
  bulletIds?: string[]
}

export interface ProfileAchievement {
  id: string
  title: string
  issuer: string
  date: string
  description: string
}

export interface ProfileDocument {
  id: string
  name: string
  url: string
  note: string
}

export type PendingSuggestionSection = 'experience' | 'projects' | 'summary' | 'skills'

export interface ProvenanceEvent {
  type: 'added_from_tailor' | 'edited' | 'accepted'
  date: string
  tailoredResumeId?: string
  jobLabel?: string
}

export interface ProvenanceEntry {
  origin: 'base' | 'tailor' | 'github'
  sourceTailoredResumeId?: string
  jobLabel?: string
  history: ProvenanceEvent[]
}

export interface PendingSuggestion {
  id: string
  section: PendingSuggestionSection
  targetEntryId?: string
  proposedText: string
  reason: string
  sourceTailoredResumeId: string
  jobLabel: string
  createdAt: string
  source?: 'tailor' | 'github'
  /** When set, accepting creates a new profile project (GitHub sync). */
  newProject?: {
    name: string
    description: string
    github: string
    technologies: string[]
    bullets: string[]
  }
}

export interface ProfileData {
  personal: ProfilePersonalInfo
  summary: string
  urls: ProfileURL[]
  experience: ResumeExperience[]
  volunteering: ProfileVolunteering[]
  projects: ResumeProject[]
  education: ResumeEducation[]
  skills: ResumeSkills
  certifications: ResumeCertification[]
  achievements: ProfileAchievement[]
  additional: string
  additionalDocuments: ProfileDocument[]
  attachments: ProfileDocument[]
  provenance?: Record<string, ProvenanceEntry>
  pendingSuggestions?: PendingSuggestion[]
}

// DB row types
export interface Profile {
  id: string
  first_name: string
  last_name: string
  username: string | null
  email: string | null
  /** HireIQ apply address (Resend inbound), e.g. name.abc123@mail.example.com */
  masked_email?: string | null
  /** Forward job posting emails here to save them to the tracker (Task 115). */
  forward_save_email?: string | null
  email_forward_to?: string | null
  email_forward_enabled?: boolean | null
  /** Default true — opt out of Gmail employer-mail sync when Google is connected. */
  gmail_sync_enabled?: boolean | null
  /** Exclusive tracking path: gmail | masked | off */
  email_tracking_mode?: 'gmail' | 'masked' | 'off' | null
  target_role: string | null
  years_experience: number | null
  profile_data: ProfileData | null
  github_data: GitHubProfileData | null
  /** Master visual theme for PDF/export (Design Mode). */
  resume_theme?: ResumeTheme | null
  created_at: string
  updated_at: string
}

export interface Resume {
  id: string
  user_id: string
  title: string
  original_file_url: string | null
  original_file_type: string | null
  raw_text: string | null
  structured_data: StructuredResume
  ats_format_score: number | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export type ApplicationStatus =
  | 'bookmarked'
  | 'applying'
  | 'applied'
  | 'interviewing'
  | 'negotiating'
  | 'offer'
  | 'rejected'
  | 'accepted'
  /** @deprecated Migrated to bookmarked — kept for reading old clients only */
  | 'not_applied'

export type ApplicationEventType =
  | 'created'
  | 'status_change'
  | 'note'
  | 'email_linked'
  | 'manual'

export type TailoringStatus = 'not_started' | 'in_progress' | 'tailored'

export interface Job {
  id: string
  user_id: string
  source: string
  company: string
  title: string
  description: string
  location: string | null
  remote_type: string | null
  apply_url: string | null
  extracted_data: JobExtractedData | null
  application_status: ApplicationStatus
  tailoring_status: TailoringStatus
  created_at: string
  updated_at: string
}

/** One tracked application form answer (extension autofill write-back). */
export interface ApplicationFormAnswer {
  key: string
  question: string
  answer: string
  updatedAt: string
}

/** One tracked application per job (Task 107). Status is source of truth; jobs.application_status mirrored for compat. */
export interface Application {
  id: string
  user_id: string
  job_id: string
  tailored_resume_id: string | null
  status: ApplicationStatus
  applied_at: string | null
  notes: string | null
  follow_up_at: string | null
  source: string
  email_log?: ApplicationEmailLogEntry[]
  templates?: ApplicationTemplate[]
  /** Extension autofill answers keyed by field. */
  form_answers?: ApplicationFormAnswer[]
  /** Email the user used on the employer ATS (extension). */
  ats_account_email?: string | null
  ats_account_note?: string | null
  ats_account_password?: string | null
  created_at: string
  updated_at: string
}

export interface ApplicationEmailLogEntry {
  id: string
  subject: string
  body?: string
  direction: 'sent' | 'received' | 'note'
  at: string
  /** Optional metadata used by the inbox UI and future provider adapters. */
  sender?: string
  recipients?: string[]
  cc?: string[]
  snippet?: string
  threadId?: string
  messageId?: string
  source?: 'manual' | 'gmail' | 'forwarded' | 'masked'
  isRead?: boolean
}

export interface ApplicationTemplate {
  id: string
  name: string
  subject: string
  body: string
}

export interface ResumeInclusion {
  /** When present, only these ids are included. Absent key = all included. */
  bulletIds?: string[]
  sectionIds?: string[]
  skillIds?: string[]
  experienceIds?: string[]
  projectIds?: string[]
  educationIds?: string[]
}

export interface ApplicationEvent {
  id: string
  application_id: string
  user_id: string
  event_type: ApplicationEventType
  from_status: ApplicationStatus | null
  to_status: ApplicationStatus | null
  meta: Record<string, unknown>
  created_at: string
}

/** Tracker list/board row: application + denormalized job fields. */
export interface ApplicationTrackerItem extends Application {
  job: Pick<
    Job,
    | 'id'
    | 'company'
    | 'title'
    | 'location'
    | 'created_at'
    | 'updated_at'
    | 'tailoring_status'
    | 'apply_url'
    | 'description'
    | 'remote_type'
    | 'extracted_data'
  >
  score: number | null
  tailored: boolean
  tailoredResumeId?: string | null
}

export interface TailoredResume {
  id: string
  user_id: string
  base_resume_id: string
  job_id: string
  structured_data: StructuredResume
  original_structured_data: StructuredResume | null
  changes: ResumeDiffChange[]
  change_decisions: Record<string, ChangeDecision>
  cover_letter: string | null
  match_score: number | null
  tailored_score: number | null
  pdf_url: string | null
  docx_url: string | null
  version: number
  gap_answers: TailorGapAnswer[]
  user_edited: boolean
  /** Sparse per-job visual overrides merged over profile master theme. */
  theme_override?: ResumeThemeOverride | null
  /** Per-job include/exclude map for Job Matcher checkboxes. */
  inclusion?: ResumeInclusion | null
  created_at: string
}

export interface TailorGapAnswer {
  questionId: string
  question: string
  answer: string
}

export type NotificationType = 'suggestion' | 'tailor_complete' | 'email_status'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  ref_id: string | null
  read: boolean
  created_at: string
}
