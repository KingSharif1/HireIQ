import {
  TAILOR_GENERATE_PROMPT,
  TAILOR_CRITIQUE_PROMPT,
  TAILOR_REGENERATE_PROMPT,
  extractJSON,
} from '@/lib/ai/prompts'
import { AI_MODELS, TAILOR_MAX_AI_CALLS } from '@/lib/ai/models'
import type { StructuredResume, JobExtractedData, GapAnalysis } from '@/types'
import type { GenerateFn, TailorPipelineResult, TailorCritiqueReport } from '@/lib/ai/tailor-types'
import { formatAdjacentForPrompt, formatRealGapsForPrompt } from '@/lib/ai/gap-analysis'
import {
  buildResumeChanges,
  buildTailorWarning,
  buildWriteBackSuggestions,
  formatEnhancements,
  normalizeCritique,
  passesTailorGate,
  pickBestAttempt,
  seniorityLengthBudget,
  shouldRetryLoop,
  jsonForPrompt,
  normalizeStructuredResume,
} from '@/lib/ai/tailor-engine'

interface PipelineInput {
  resume: StructuredResume
  job: JobExtractedData
  answers: Record<string, string>
  /** Maps questionId → real question text so the model sees the actual gap question. */
  questionLabels?: Record<string, string>
  gapAnalysis?: GapAnalysis | null
  githubContext?: string
  generate: GenerateFn
  models?: { strong: string; fast: string }
  /** One generate + one fast critique — skips retry loop (faster). */
  fastMode?: boolean
}

async function callGenerate(
  generate: GenerateFn,
  model: string,
  prompt: string,
  maxOutputTokens: number,
  aiCallsUsed: { n: number }
): Promise<string> {
  if (aiCallsUsed.n >= TAILOR_MAX_AI_CALLS) {
    throw new Error('Tailor run exceeded AI call budget')
  }
  aiCallsUsed.n += 1
  return generate({ model, prompt, maxOutputTokens })
}

function parseResume(text: string): StructuredResume {
  return normalizeStructuredResume(JSON.parse(extractJSON(text)) as Partial<StructuredResume>)
}

function parseCritique(text: string): TailorCritiqueReport {
  return normalizeCritique(JSON.parse(extractJSON(text)))
}

export async function runTailorPipeline(input: PipelineInput): Promise<TailorPipelineResult> {
  const resume = normalizeStructuredResume(input.resume)
  const { job, answers, questionLabels, gapAnalysis, generate } = input
  const models = input.models ?? { strong: AI_MODELS.strong, fast: AI_MODELS.fast }
  const enhancements = formatEnhancements(answers, questionLabels)
  const realGaps = formatRealGapsForPrompt(gapAnalysis?.real_gaps ?? [])
  const adjacentMatches = formatAdjacentForPrompt(gapAnalysis?.adjacent_matches ?? [])
  const aiCallsUsed = { n: 0 }
  const critiques: TailorCritiqueReport[] = []
  const attempts: { resume: StructuredResume; critique: TailorCritiqueReport }[] = []

  const generatePrompt = TAILOR_GENERATE_PROMPT
    .replace('{structuredResume}', jsonForPrompt(resume))
    .replace('{githubContext}', input.githubContext ?? 'No GitHub repos synced.')
    .replace('{jobAnalysis}', jsonForPrompt(job))
    .replace('{enhancements}', enhancements)
    .replace('{realGaps}', realGaps)
    .replace('{adjacentMatches}', adjacentMatches)
    .replace('{atsSystem}', job.ats_system || 'generic')
    .replace('{seniority}', job.seniority || 'mid')
    .replace('{lengthBudget}', seniorityLengthBudget(job.seniority || 'mid'))

  const genText = await callGenerate(generate, models.strong, generatePrompt, 6000, aiCallsUsed)
  let current = parseResume(genText)

  const critiquePromptBase = {
    structuredResume: jsonForPrompt(resume),
    jobAnalysis: jsonForPrompt(job),
  }

  async function critiqueDraft(draft: StructuredResume, useStrongModel: boolean): Promise<TailorCritiqueReport> {
    const prompt = TAILOR_CRITIQUE_PROMPT
      .replace('{structuredResume}', critiquePromptBase.structuredResume)
      .replace('{tailoredResume}', jsonForPrompt(draft))
      .replace('{jobAnalysis}', critiquePromptBase.jobAnalysis)

    const model = useStrongModel ? models.strong : models.fast
    const text = await callGenerate(generate, model, prompt, 2000, aiCallsUsed)
    const report = parseCritique(text)
    critiques.push(report)
    return report
  }

  let critique = await critiqueDraft(current, false)
  attempts.push({ resume: current, critique })

  if (!input.fastMode) {
    let attempt = 0
    while (shouldRetryLoop(attempt, critique)) {
      attempt += 1

      const regenPrompt = TAILOR_REGENERATE_PROMPT
        .replace('{weakSections}', (critique.weak_sections ?? []).join(', ') || 'summary, experience')
        .replace('{critiqueFlags}', JSON.stringify((critique.flags ?? []).slice(0, 10)))
        .replace('{suggestions}', (critique.suggestions ?? []).join('\n') || 'Improve ATS keyword alignment')
        .replace('{structuredResume}', jsonForPrompt(resume))
        .replace('{tailoredResume}', jsonForPrompt(current))
        .replace('{jobAnalysis}', jsonForPrompt(job))
        .replace('{enhancements}', enhancements)
        .replace('{realGaps}', realGaps)
        .replace('{adjacentMatches}', adjacentMatches)

      const regenText = await callGenerate(generate, models.strong, regenPrompt, 6000, aiCallsUsed)
      current = parseResume(regenText)
      critique = await critiqueDraft(current, false)
      attempts.push({ resume: current, critique })
    }
  }

  const finalCritique = input.fastMode ? critique : await critiqueDraft(current, true)
  const best = pickBestAttempt(attempts)
  const finalResume = passesTailorGate(finalCritique) ? current : best.resume
  const reportForMeta = passesTailorGate(finalCritique) ? finalCritique : best.critique

  const notes = finalResume.tailoring_notes ?? []
  const changes = buildResumeChanges(resume, finalResume, notes)
  const writeBackSuggestions = buildWriteBackSuggestions(answers, job.title || 'this role')

  return {
    tailoredResume: finalResume,
    changes,
    tailoringNotes: notes,
    writeBackSuggestions,
    meta: {
      attempts: attempts.length,
      passedGate: passesTailorGate(reportForMeta),
      warning: buildTailorWarning(reportForMeta),
      finalOverlapPercent: reportForMeta.language_overlap_percent,
      aiCallsUsed: aiCallsUsed.n,
      critiques,
    },
  }
}
