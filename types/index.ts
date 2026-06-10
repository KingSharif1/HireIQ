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
  technologies: string[]
  url: string
  github: string
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
}

export interface CoverLetterResult {
  subject_line: string
  cover_letter: string
  keywords_used: string[]
  word_count: number
  tone: 'professional' | 'conversational' | 'enthusiastic'
}

export interface ResumeDiffChange {
  section: string
  field: string
  expId?: string
  before: string | string[]
  after: string | string[]
}

// DB row types
export interface Profile {
  id: string
  first_name: string
  last_name: string
  username: string | null
  email: string | null
  target_role: string | null
  years_experience: number | null
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
  created_at: string
}

export interface TailoredResume {
  id: string
  user_id: string
  base_resume_id: string
  job_id: string
  structured_data: StructuredResume
  changes: ResumeDiffChange[]
  cover_letter: string | null
  match_score: number | null
  tailored_score: number | null
  pdf_url: string | null
  docx_url: string | null
  created_at: string
}
