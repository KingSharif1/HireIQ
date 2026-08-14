import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { getMasterResumeContext } from '@/lib/profile/master'
import { formatGitHubContextForAi } from '@/lib/profile/github-context'
import type { GitHubProfileData } from '@/lib/github/types'
import { runTailorPipeline } from '@/lib/ai/tailor-pipeline'
import type { GenerateFn } from '@/lib/ai/tailor-types'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { generateAiText } from '@/lib/ai/complete'
import {
  buildTailorCompleteNotification,
} from '@/lib/notifications'
import { insertNotifications } from '@/lib/supabase/queries'
import { withChangeIds, initialDecisions } from '@/lib/tailor/change-decisions'
import { createProcessLog } from '@/lib/tailor/process-log'
import { gapAnalysisFromAts } from '@/lib/tailor/ats-gap-hints'
import type { GapAnalysis } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

/** Same-instance guard — React re-renders were firing overlapping tailor POSTs. */
const inflightTailors = new Set<string>()

export async function POST(request: Request) {
  const log = createProcessLog()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  log.step('Authenticated')

  let ai
  try {
    ai = await resolveAiRuntime(user.id)
    log.step(
      'AI configured',
      `${ai.keySource === 'byok' ? 'Your Anthropic key' : 'HireIQ key'} · strong ${ai.models.strong} · fast ${ai.models.fast}`,
    )
  } catch (err) {
    log.fail('AI configuration', err instanceof Error ? err.message : 'Not configured')
    return aiErrorResponse(err, 'AI is not configured', log.entries)
  }

  const generateFn: GenerateFn = async ({ model, prompt, maxOutputTokens }) => {
    log.step('Claude generate pass', `model ${model}`, 'pending')
    const result = await generateAiText({
      runtime: ai,
      feature: 'tailor_resume',
      tier: 'strong',
      prompt,
      maxOutputTokens,
      modelOverride: model,
    })
    const last = log.entries[log.entries.length - 1]
    if (last?.status === 'pending') {
      log.entries[log.entries.length - 1] = {
        ...last,
        status: 'ok',
        label: 'Claude generate pass done',
        detail: `${result.text.length.toLocaleString()} chars returned`,
      }
    }
    return result.text
  }

  const { resumeId, jobId, answers, questions, gapAnalysis, fastMode } = await request.json() as {
    resumeId?: string
    jobId: string
    answers: Record<string, string>
    questions?: { id: string; question: string }[]
    gapAnalysis?: GapAnalysis | null
    fastMode?: boolean
  }

  if (!jobId) return NextResponse.json({ error: 'jobId required', processLog: log.entries }, { status: 400 })

  const lockKey = `${user.id}:${jobId}`
  if (inflightTailors.has(lockKey)) {
    log.fail('Blocked overlapping run', 'A tailor for this job is already in progress')
    return NextResponse.json(
      { error: 'A tailor run is already in progress for this job. Wait for it to finish — do not refresh.', processLog: log.entries },
      { status: 429 },
    )
  }
  inflightTailors.add(lockKey)

  const answerCount = Object.values(answers ?? {}).filter(a => a?.trim()).length
  log.step(
    'Request validated',
    `${answerCount} gap answer(s) · ${fastMode ? 'fast tailor (1 Claude call, no loop)' : 'full tailor'} · jobId ${jobId.slice(0, 8)}…`,
  )

  // Resolve questionId → real question text so the model and the saved record
  // both see the actual question asked (not a meaningless "q1" id).
  const questionLabels: Record<string, string> = {}
  for (const q of questions ?? []) {
    if (q?.id && q?.question) questionLabels[q.id] = q.question
  }
  const labelFor = (id: string) => questionLabels[id] ?? id

  const master = await getMasterResumeContext(supabase, user.id, resumeId)
  if ('error' in master) {
    log.fail('Load profile/resume', master.error)
    inflightTailors.delete(lockKey)
    return NextResponse.json({ error: master.error, processLog: log.entries }, { status: master.status })
  }

  const [{ data: jobRow }, { data: profileRow }] = await Promise.all([
    supabase
      .from('jobs')
      .select('extracted_data, description')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single(),
    supabase.from('profiles').select('github_data').eq('id', user.id).maybeSingle(),
  ])

  if (!jobRow?.extracted_data) {
    log.fail('Load job', 'Job not found or missing extracted_data')
    inflightTailors.delete(lockKey)
    return NextResponse.json({ error: 'Job not found', processLog: log.entries }, { status: 404 })
  }

  const githubContext = formatGitHubContextForAi(
    profileRow?.github_data as GitHubProfileData | null | undefined
  )
  const ghRepos = (profileRow?.github_data as GitHubProfileData | null)?.repos?.length ?? 0
  const job = jobRow.extracted_data
  log.step(
    'Context loaded',
    `full master resume (${JSON.stringify(master.structured).length.toLocaleString()} chars) · job ${job.title || 'role'} · GitHub ${ghRepos > 0 ? `${ghRepos} repos` : 'none'}`,
  )

  const resume = master.structured
  const baseResumeId = master.baseResumeId
  const gapAnswers = answers ?? {}

  const baseline = calculateATSScore(resume, job)
  const effectiveGapAnalysis =
    gapAnalysis ?? gapAnalysisFromAts(baseline)
  if (!gapAnalysis) {
    log.step(
      'Gap hints from ATS (instant)',
      `${effectiveGapAnalysis.real_gaps.length} gaps · skipped Claude gap-analysis call`,
    )
  }

  if (gapAnswers && Object.keys(gapAnswers).length > 0) {
    const enhancementRows = Object.entries(gapAnswers)
      .filter(([, answer]) => answer.trim())
      .map(([questionId, answer]) => ({
        user_id: user.id,
        category: 'experience',
        question: labelFor(questionId),
        answer: answer.trim(),
        applied_to_resume: true,
      }))

    if (enhancementRows.length > 0) {
      await supabase.from('resume_enhancements').insert(enhancementRows)
    }
  }

  let pipelineResult
  try {
    log.step('Tailor pipeline', 'Draft → critique loop → score', 'pending')
    pipelineResult = await runTailorPipeline({
      resume,
      job,
      answers: gapAnswers,
      questionLabels,
      gapAnalysis: effectiveGapAnalysis,
      githubContext,
      generate: generateFn,
      models: ai.models,
      fastMode: Boolean(fastMode),
    })
    const { meta } = pipelineResult
    log.entries[log.entries.length - 1] = {
      ...log.entries[log.entries.length - 1],
      status: meta.passedGate ? 'ok' : 'warn',
      label: meta.passedGate ? 'Tailor pipeline complete' : 'Tailor pipeline finished with warnings',
      detail: `${meta.aiCallsUsed} AI calls · ${meta.attempts} attempt(s) · overlap ${meta.finalOverlapPercent}%${meta.warning ? ` · ${meta.warning}` : ''}`,
    }
  } catch (err) {
    log.fail('Tailor pipeline', err instanceof Error ? err.message : 'Pipeline failed')
    inflightTailors.delete(lockKey)
    return aiErrorResponse(err, 'Failed to tailor resume', log.entries)
  }

  const { tailoredResume, changes, writeBackSuggestions, meta } = pipelineResult
  const changesWithIds = withChangeIds(changes)

  const matchScore = calculateATSScore(resume, job).total
  const tailoredScore = calculateATSScore(tailoredResume, job).total

  const { count: priorVersions } = await supabase
    .from('tailored_resumes')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('user_id', user.id)

  const gapAnswersRecord = Object.entries(gapAnswers)
    .filter(([, answer]) => answer.trim())
    .map(([questionId, answer]) => ({ questionId, question: labelFor(questionId), answer: answer.trim() }))

  const { data: tailoredRow, error: dbErr } = await supabase
    .from('tailored_resumes')
    .insert({
      user_id: user.id,
      base_resume_id: baseResumeId,
      job_id: jobId,
      structured_data: tailoredResume,
      original_structured_data: resume,
      changes: changesWithIds,
      change_decisions: initialDecisions(changesWithIds),
      match_score: matchScore,
      tailored_score: tailoredScore,
      version: (priorVersions ?? 0) + 1,
      gap_answers: gapAnswersRecord,
    })
    .select()
    .single()

  if (dbErr) {
    log.fail('Save tailored resume', dbErr.message)
    inflightTailors.delete(lockKey)
    return NextResponse.json({ error: 'Failed to save tailored resume', processLog: log.entries }, { status: 500 })
  }

  log.step(
    'Saved tailored version',
    `v${tailoredRow.version} · score ${matchScore}% → ${tailoredScore}% · ${changesWithIds.length} changes`,
  )

  await supabase
    .from('jobs')
    .update({ tailoring_status: 'tailored', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('user_id', user.id)

  const jobLabel = `${job.title || 'Role'} @ ${job.company || 'Company'}`
  // Explicit Suggest for master only — do not auto-queue pending on generate
  await insertNotifications(supabase, [
    buildTailorCompleteNotification(user.id, jobLabel, tailoredRow.id),
  ])

  inflightTailors.delete(lockKey)
  return NextResponse.json({
    tailoredResumeId: tailoredRow.id,
    tailoredData: tailoredResume,
    originalData: resume,
    changes: changesWithIds,
    matchScore,
    tailoredScore,
    version: tailoredRow.version,
    source: master.source,
    baseResumeId,
    tailoringNotes: tailoredResume.tailoring_notes ?? [],
    writeBackSuggestions,
    meta: {
      passedGate: meta.passedGate,
      warning: meta.warning,
      finalOverlapPercent: meta.finalOverlapPercent,
      attempts: meta.attempts,
      aiCallsUsed: meta.aiCallsUsed,
      models: ai.models,
      keySource: ai.keySource,
    },
    processLog: log.entries,
  })
}
