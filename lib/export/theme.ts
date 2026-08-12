/** Visual-only resume theme — drives PDF/export rendering, not content. */

export type ResumeDateFormat = 'MM/YYYY' | 'YYYY' | 'MMM YYYY' | 'MMMM YYYY'

export type ResumeHeaderAlign = 'left' | 'center' | 'right'

export type ResumeDateAlign = 'left' | 'right'

export type ResumeLocationAlign = 'left' | 'right'

export type ResumeSkillsLayout = 'comma' | 'comma-list' | 'columns'

export type ResumePaperSize = 'letter'

export type ResumeEducationLayout = 'stacked' | 'inline'

export interface ResumeExperienceSettings {
  /** Which line shows location (company row vs title row). */
  showLocationBy: 'company-line' | 'title-line' | 'hidden'
  /** Primary emphasis in experience entry header. */
  showBy: 'title-first' | 'company-first'
  /** Date placement relative to entry header. */
  showDatesBy: 'right' | 'inline'
}

export interface ResumeEducationSettings {
  showBy: 'degree-first' | 'institution-first'
  layout: ResumeEducationLayout
}

export interface ResumeEntrySpacing {
  section: number
  experience: number
  education: number
  project: number
}

export interface ResumeContentSpacing {
  heading: number
  subheading: number
  body: number
  listItem: number
}

export interface ResumeTheme {
  fontFamily: string
  nameFontSize: number
  bodyFontSize: number
  lineHeight: number
  listLineHeight: number
  accentColor: string
  dateFormat: ResumeDateFormat
  headerAlign: ResumeHeaderAlign
  dateAlign: ResumeDateAlign
  locationAlign: ResumeLocationAlign
  skillsLayout: ResumeSkillsLayout
  paperSize: ResumePaperSize
  marginX: number
  marginY: number
  sectionOrder: string[]
  sectionLabels: Record<string, string>
  experienceSettings: ResumeExperienceSettings
  educationSettings: ResumeEducationSettings
  entrySpacing: ResumeEntrySpacing
  contentSpacing: ResumeContentSpacing
}

/** Sparse override — nested settings objects may be partial. */
export type ResumeThemeOverride = {
  [K in keyof ResumeTheme]?: ResumeTheme[K] extends Array<infer U>
    ? U[]
    : ResumeTheme[K] extends object
      ? Partial<ResumeTheme[K]>
      : ResumeTheme[K]
}

export const DEFAULT_SECTION_ORDER = [
  'summary',
  'experience',
  'skills',
  'education',
  'projects',
] as const

export const DEFAULT_SECTION_LABELS: Record<string, string> = {
  summary: 'Summary',
  experience: 'Experience',
  skills: 'Skills',
  education: 'Education',
  projects: 'Projects',
}

/** HireIQ default — matches current PDF template (~Helvetica, center header, 0.5" margins). */
export const DEFAULT_RESUME_THEME: ResumeTheme = {
  fontFamily: 'Helvetica',
  nameFontSize: 22,
  bodyFontSize: 10,
  lineHeight: 1.4,
  listLineHeight: 1.4,
  accentColor: '#333333',
  dateFormat: 'MM/YYYY',
  headerAlign: 'center',
  dateAlign: 'right',
  locationAlign: 'left',
  skillsLayout: 'comma',
  paperSize: 'letter',
  marginX: 0.5,
  marginY: 0.5,
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  sectionLabels: { ...DEFAULT_SECTION_LABELS },
  experienceSettings: {
    showLocationBy: 'company-line',
    showBy: 'title-first',
    showDatesBy: 'right',
  },
  educationSettings: {
    showBy: 'degree-first',
    layout: 'stacked',
  },
  entrySpacing: {
    section: 14,
    experience: 8,
    education: 6,
    project: 6,
  },
  contentSpacing: {
    heading: 4,
    subheading: 2,
    body: 4,
    listItem: 2,
  },
}

const POINTS_PER_INCH = 72

/** Convert theme margin inches to react-pdf padding (points). */
export function themeToPdfPadding(theme: ResumeTheme): {
  paddingTop: number
  paddingBottom: number
  paddingHorizontal: number
} {
  const vertical = theme.marginY * POINTS_PER_INCH
  const horizontal = theme.marginX * POINTS_PER_INCH
  return {
    paddingTop: vertical,
    paddingBottom: vertical,
    paddingHorizontal: horizontal,
  }
}

function mergeNested<T extends object>(base: T, override?: Partial<T> | null): T {
  if (!override) return { ...base }
  return { ...base, ...override }
}

/** Map react-pdf font names to CSS font stacks for HTML preview. */
export function themeFontFamilyCss(fontFamily: string): string {
  switch (fontFamily) {
    case 'Times-Roman':
      return 'Georgia, "Times New Roman", serif'
    case 'Courier':
      return 'Courier New, Courier, monospace'
    case 'Helvetica':
    default:
      return 'Helvetica, Arial, sans-serif'
  }
}

/** Join skill labels for comma / comma-list layouts (columns render separately). */
export function formatSkillsInline(
  skills: string[],
  layout: ResumeSkillsLayout
): string {
  if (layout === 'comma') return skills.join(', ')
  return skills.join(' · ')
}

/** Deep-ish merge: nested objects merge; arrays and scalars replace when provided. */
export function mergeResumeTheme(
  master: ResumeTheme,
  override?: ResumeThemeOverride | null
): ResumeTheme {
  if (!override) return { ...master }

  return {
    ...master,
    ...override,
    sectionOrder: override.sectionOrder ?? master.sectionOrder,
    sectionLabels: mergeNested(master.sectionLabels, override.sectionLabels),
    experienceSettings: mergeNested(master.experienceSettings, override.experienceSettings),
    educationSettings: mergeNested(master.educationSettings, override.educationSettings),
    entrySpacing: mergeNested(master.entrySpacing, override.entrySpacing),
    contentSpacing: mergeNested(master.contentSpacing, override.contentSpacing),
  }
}
