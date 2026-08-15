import { TAILOR_GENERATE_PROMPT } from '@/lib/ai/prompts'
import { parseModelJson } from '@/lib/ai/parse-json'
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
  return normalizeStructuredResume(parseModelJson<Partial<StructuredResume>>(text))
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

  // One rewrite + one parse-retry. Bad JSON on huge JDs (e.g. Apple early career) is common;
  // retry once with a stricter JSON reminder instead of failing the whole run.
  const maxGenerateCalls = 2
  let genText = await callGenerate(
    generate,
    models.strong,
    generatePrompt,
    8000,
    aiCallsUsed,
    maxGenerateCalls,
  )
  let current: StructuredResume
  try {
    current = parseResume(genText)
  } catch (firstErr) {
    console.error('[tailor] rewrite JSON unusable, retrying once', firstErr)
    const retryPrompt = `${generatePrompt}

CRITICAL RETRY: Your previous reply was not valid JSON (syntax error). Return ONLY one compact JSON object — no markdown fences, no commentary, escape every " inside strings, commas between every array/object element.`
    genText = await callGenerate(
      generate,
      models.strong,
      retryPrompt,
      8000,
      aiCallsUsed,
      maxGenerateCalls,
    )
    current = parseResume(genText)
  }
  const notes = current.tailoring_notes ?? []
  const changes = buildResumeChanges(resume, current, notes)

  return {
    tailoredResume: current,
    changes,
    tailoringNotes: notes,
    writeBackSuggestions: buildWriteBackSuggestions(answers, job.title || 'this role', {
      questionLabels,
      profile: {
        experience: resume.experience.map(e => ({ id: e.id, company: e.company, title: e.title })),
        projects: resume.projects.map(p => ({ id: p.id, name: p.name })),
      },
      changes,
    }),
    meta: {
      attempts: aiCallsUsed.n,
      passedGate: true,
      warning: undefined,
      finalOverlapPercent: 0,
      aiCallsUsed: aiCallsUsed.n,
      critiques: [],
    },
  }
}
