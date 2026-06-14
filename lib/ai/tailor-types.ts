import type { StructuredResume, ResumeDiffChange, TailoringNote } from '@/types'

export type TailorCritiqueFlagType =
  | 'unsupported_claim'
  | 'vague'
  | 'generic'
  | 'robotic'

export interface TailorCritiqueFlag {
  type: TailorCritiqueFlagType
  section: string
  field?: string
  expId?: string
  detail: string
}

export interface TailorCritiqueReport {
  language_overlap_percent: number
  ats_pass: boolean
  human_pass: boolean
  flags: TailorCritiqueFlag[]
  weak_sections: string[]
  suggestions: string[]
}

export interface WriteBackSuggestion {
  id: string
  section: 'experience' | 'projects' | 'skills' | 'summary'
  targetEntryId?: string
  proposedText: string
  reason: string
  sourceQuestionId?: string
}

export interface TailorPipelineMeta {
  attempts: number
  passedGate: boolean
  warning?: string
  finalOverlapPercent: number
  aiCallsUsed: number
  critiques: TailorCritiqueReport[]
}

export interface TailorPipelineResult {
  tailoredResume: StructuredResume
  changes: ResumeDiffChange[]
  tailoringNotes: TailoringNote[]
  writeBackSuggestions: WriteBackSuggestion[]
  meta: TailorPipelineMeta
}

export type GenerateFn = (opts: {
  model: string
  prompt: string
  maxOutputTokens: number
}) => Promise<string>
