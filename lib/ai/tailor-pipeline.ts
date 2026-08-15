import { TAILOR_GENERATE_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { AI_MODELS, TAILOR_MAX_AI_CALLS } from '@/lib/ai/models'
import type { StructuredResume, JobExtractedData, GapAnalysis } from '@/types'
import type { GenerateFn, TailorPipelineResult } from '@/lib/ai/tailor-types'
import { formatAdjacentForPrompt, formatRealGapsForPrompt } from '@/lib/ai/gap-analysis'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { formatAtsGapsForPrompt } from '@/lib/tailor/ats-gap-hints'
import {
  buildResumeChanges,
  buildWriteBackSuggestions,
  formatEnhancements,
  seniorityLengthBudget,
  jsonForPrompt,
  normalizeStructuredResume,
} from '@/lib/ai/tailor-engine'

interface PipelineInput {
  resume: StructuredResume
  job: JobExtractedData
  answers: Record<string, string>
  questionLabels?: Record<string, string>
  gapAnalysis?: GapAnalysis | null
  githubContext?: string
  generate: GenerateFn
  models?: { strong: string; fast: string }
  /** Kept for callers; all modes are one Claude rewrite — no critique/retry. */
  fastMode?: boolean
}

async function callGenerate(
  generate: GenerateFn,
  model: string,
  prompt: string,
  maxOutputTokens: number,
  aiCallsUsed: { n: number },
  maxCalls = TAILOR_MAX_AI_CALLS
): Promise<string> {
  if (aiCallsUsed.n >= maxCalls) {
    throw new Error('Tailor run exceeded AI call budget')
  }
  aiCallsUsed.n += 1
  return generate({ model, prompt, maxOutputTokens })
}

function parseResume(text: string): StructuredResume {
  return normalizeStructuredResume(JSON.parse(extractJSON(text)) as Partial<StructuredResume>)
}

export async function runTailorPipeline(input: PipelineInput): Promise<TailorPipelineResult> {
  const resume = normalizeStructuredResume(input.resume)
  const { job, answers, questionLabels, gapAnalysis, generate } = input
  const models = input.models ?? { strong: AI_MODELS.strong, fast: AI_MODELS.fast }
  const enhancements = formatEnhancements(answers, questionLabels)
  const realGaps = formatRealGapsForPrompt(gapAnalysis?.real_gaps ?? [])
  const adjacentMatches = formatAdjacentForPrompt(gapAnalysis?.adjacent_matches ?? [])
  const aiCallsUsed = { n: 0 }

  const atsGaps = formatAtsGapsForPrompt(calculateATSScore(resume, job))

  const generatePrompt = TAILOR_GENERATE_PROMPT
    .replace('{structuredResume}', jsonForPrompt(resume))
    .replace('{githubContext}', input.githubContext ?? 'No GitHub repos synced.')
    .replace('{jobAnalysis}', jsonForPrompt(job))
    .replace('{atsGaps}', atsGaps)
    .replace('{enhancements}', enhancements)
    .replace('{realGaps}', realGaps)
    .replace('{adjacentMatches}', adjacentMatches)
    .replace('{atsSystem}', job.ats_system || 'generic')
    .replace('{seniority}', job.seniority || 'mid')
    .replace('{lengthBudget}', seniorityLengthBudget(job.seniority || 'mid'))

  const genText = await callGenerate(generate, models.strong, generatePrompt, 6000, aiCallsUsed, 1)
  const current = parseResume(genText)
  const notes = current.tailoring_notes ?? []
  const changes = buildResumeChanges(resume, current, notes)

  return {
    tailoredResume: current,
    changes,
    tailoringNotes: notes,
    writeBackSuggestions: buildWriteBackSuggestions(answers, job.title || 'this role'),
    meta: {
      attempts: 1,
      passedGate: true,
      warning: undefined,
      finalOverlapPercent: 0,
      aiCallsUsed: aiCallsUsed.n,
      critiques: [],
    },
  }
}
