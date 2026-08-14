import { GAP_ANALYSIS_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { generateAiText } from '@/lib/ai/complete'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { withAiOnce } from '@/lib/ai/once'
import { normalizeGapAnalysis } from '@/lib/ai/gap-analysis'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { getMasterResumeContext } from '@/lib/profile/master'
import { formatGitHubContextForAi } from '@/lib/profile/github-context'
import type { GitHubProfileData } from '@/lib/github/types'
import { runTailorPipeline } from '@/lib/ai/tailor-pipeline'
import type { GenerateFn } from '@/lib/ai/tailor-types'
import { gapAnalysisFromAts } from '@/lib/tailor/ats-gap-hints'
import { withChangeIds, initialDecisions } from '@/lib/tailor/change-decisions'
import { createProcessLog } from '@/lib/tailor/process-log'
import { buildTailorCompleteNotification } from '@/lib/notifications'
import { insertNotifications } from '@/lib/supabase/queries'
import { createAdminClient } from '@/lib/supabase/admin'
import { claimGapPhase, claimGeneratePhase, getTailorRun, patchTailorRun } from '@/lib/tailor/runs'
import { TAILOR_RUN_CLAUDE } from '@/lib/tailor/run-types'
import type { GapAnalysis } from '@/types'

async function failRun(runId: string, log: ReturnType<typeof createProcessLog>, message: string) {
  log.fail('Stopped', message)
  await patchTailorRun(createAdminClient(), runId, {
    status: 'failed',
    error: message,
    process_log: log.entries,
    finished_at: new Date().toISOString(),
  })
}

/** Claude call 1 of 2: gap questions. Skipped when ATS finds nothing to ask. Never retried. */
export async function executeGapPhase(runId: string, userId: string): Promise<void> {
  const admin = createAdminClient()
  const existing = await getTailorRun(admin, userId, runId)
  if (!existing) return
  if (existing.status !== 'analyzing_gaps') return

  const run = await claimGapPhase(admin, runId)
  if (!run) return

  const log = createProcessLog()
  log.step('Loaded session', 'Resume + job from database (no Claude yet)')

  const [master, jobRes, profileRes] = await Promise.all([
    getMasterResumeContext(admin, userId, null),
    admin.from('jobs').select('extracted_data').eq('id', run.job_id).eq('user_id', userId).single(),
    admin.from('profiles').select('github_data').eq('id', userId).maybeSingle(),
  ])

  if ('error' in master) {
    await failRun(runId, log, master.error)
    return
  }
  const jobData = jobRes.data?.extracted_data
  if (!jobData) {
    await failRun(runId, log, 'Job missing extracted requirements')
    return
  }

  const resume = master.structured
  const score = calculateATSScore(resume, jobData)
  const githubData = profileRes.data?.github_data as GitHubProfileData | null | undefined
  const githubContext = formatGitHubContextForAi(githubData ?? null)
  log.step(
    'Context ready',
    `full resume · ${jobData.title || 'role'} @ ${jobData.company || 'company'} · ATS ${score.total}% · ${score.missing_skills.length} skill gaps`,
  )

  const atsGap = gapAnalysisFromAts(score)
  const shouldAskClaude =
    atsGap.real_gaps.length > 0 || score.missing_skills.length > 0 || score.missing_keywords.length > 0

  if (!shouldAskClaude) {
    log.step('No material gaps', 'ATS found nothing to ask — skipping Claude gap call. One rewrite next.')
    await patchTailorRun(admin, runId, {
      status: 'generating',
      gap_analysis: atsGap,
      questions: [],
      process_log: log.entries,
    })
    await executeGeneratePhase(runId, userId, {})
    return
  }

  let ai
  try {
    ai = await resolveAiRuntime(userId)
  } catch (err) {
    await failRun(runId, log, err instanceof Error ? err.message : 'AI is not configured')
    return
  }

  const gaps = [
    ...score.missing_skills.slice(0, 5).map(s => `Missing skill: ${s}`),
    ...score.missing_keywords.slice(0, 5).map(k => `Missing keyword: ${k}`),
  ].join('\n')

  const prompt = GAP_ANALYSIS_PROMPT
    .replace('{structuredResume}', JSON.stringify(resume, null, 2))
    .replace('{githubContext}', githubContext)
    .replace('{jobRequirements}', JSON.stringify(jobData, null, 2))
    .replace('{gaps}', gaps || 'No major gaps identified from ATS pre-scan')

  log.step('Claude gap analysis', 'Call 1 of 2 — comparing profile to this job', 'pending')
  let gapAnalysis: GapAnalysis
  try {
    const result = await withAiOnce(`gap_questions:${userId}:${run.job_id}`, () =>
      generateAiText({
        runtime: ai,
        feature: 'gap_questions',
        tier: 'strong',
        prompt,
        maxOutputTokens: 2500,
      }),
    )
    gapAnalysis = normalizeGapAnalysis(JSON.parse(extractJSON(result.text)))
    const last = log.entries[log.entries.length - 1]
    if (last) {
      last.status = 'ok'
      last.label = 'Claude gap analysis done'
      last.detail = `${gapAnalysis.questions_for_user.length} question(s) · ${gapAnalysis.real_gaps.length} gaps`
    }
    await patchTailorRun(admin, runId, {
      claude_calls: TAILOR_RUN_CLAUDE.gap,
      process_log: log.entries,
    })
  } catch (err) {
    await failRun(runId, log, err instanceof Error ? err.message : 'Gap analysis failed')
    return
  }

  const questions = gapAnalysis.questions_for_user
  if (questions.length === 0) {
    log.step('No questions', 'Claude had nothing to ask — starting the one rewrite')
    await patchTailorRun(admin, runId, {
      status: 'generating',
      gap_analysis: gapAnalysis,
      questions: [],
      process_log: log.entries,
    })
    await executeGeneratePhase(runId, userId, {})
    return
  }

  log.step('Waiting for you', `${questions.length} question(s) — tailor will not start until you answer`)
  await patchTailorRun(admin, runId, {
    status: 'awaiting_answers',
    gap_analysis: gapAnalysis,
    questions,
    process_log: log.entries,
  })
}

/** Claude call 2 of 2: one resume rewrite. Never retried. */
export async function executeGeneratePhase(
  runId: string,
  userId: string,
  answers: Record<string, string>,
): Promise<void> {
  const admin = createAdminClient()
  const existing = await getTailorRun(admin, userId, runId)
  if (!existing) return
  if (existing.status === 'needs_review' || existing.status === 'failed' || existing.status === 'cancelled') {
    return
  }

  const run = await claimGeneratePhase(admin, runId, answers)
  if (!run) return

  const log = createProcessLog()
  for (const entry of run.process_log) log.entries.push(entry)
  log.step('Starting rewrite', 'Call 2 of 2 — one Claude tailor, no retry')

  let ai
  try {
    ai = await resolveAiRuntime(userId)
  } catch (err) {
    await failRun(runId, log, err instanceof Error ? err.message : 'AI is not configured')
    return
  }

  const [master, jobRes, profileRes] = await Promise.all([
    getMasterResumeContext(admin, userId, null),
    admin.from('jobs').select('extracted_data').eq('id', run.job_id).eq('user_id', userId).single(),
    admin.from('profiles').select('github_data').eq('id', userId).maybeSingle(),
  ])
  if ('error' in master) {
    await failRun(runId, log, master.error)
    return
  }
  const job = jobRes.data?.extracted_data
  if (!job) {
    await failRun(runId, log, 'Job not found')
    return
  }

  const githubContext = formatGitHubContextForAi(
    profileRes.data?.github_data as GitHubProfileData | null | undefined,
  )
  const gapAnalysis = run.gap_analysis ?? gapAnalysisFromAts(calculateATSScore(master.structured, job))
  const questionLabels: Record<string, string> = {}
  for (const q of run.questions) {
    if (q?.id && q?.question) questionLabels[q.id] = q.question
  }

  const generateFn: GenerateFn = async ({ model, prompt, maxOutputTokens }) => {
    log.step('Claude rewrite', `model ${model}`, 'pending')
    await patchTailorRun(admin, runId, { process_log: log.entries })
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
      last.status = 'ok'
      last.label = 'Claude rewrite done'
      last.detail = `${result.text.length.toLocaleString()} chars`
    }
    return result.text
  }

  try {
    const pipelineResult = await withAiOnce(`tailor-generate:${userId}:${run.job_id}`, () =>
      runTailorPipeline({
        resume: master.structured,
        job,
        answers,
        questionLabels,
        gapAnalysis,
        githubContext,
        generate: generateFn,
        models: ai.models,
      }),
    )

    const { tailoredResume, changes } = pipelineResult
    const changesWithIds = withChangeIds(changes)
    const matchScore = calculateATSScore(master.structured, job).total
    const tailoredScore = calculateATSScore(tailoredResume, job).total
    const { count: priorVersions } = await admin
      .from('tailored_resumes')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', run.job_id)
      .eq('user_id', userId)

    const gapAnswersRecord = Object.entries(answers)
      .filter(([, answer]) => answer.trim())
      .map(([questionId, answer]) => ({
        questionId,
        question: questionLabels[questionId] ?? questionId,
        answer: answer.trim(),
      }))

    const { data: tailoredRow, error: dbErr } = await admin
      .from('tailored_resumes')
      .insert({
        user_id: userId,
        base_resume_id: master.baseResumeId,
        job_id: run.job_id,
        structured_data: tailoredResume,
        original_structured_data: master.structured,
        changes: changesWithIds,
        change_decisions: initialDecisions(changesWithIds),
        match_score: matchScore,
        tailored_score: tailoredScore,
        version: (priorVersions ?? 0) + 1,
        gap_answers: gapAnswersRecord,
      })
      .select('id, version')
      .single()

    if (dbErr || !tailoredRow) {
      await failRun(runId, log, dbErr?.message || 'Failed to save tailored resume')
      return
    }

    log.step(
      'Ready to review',
      `v${tailoredRow.version} · ${matchScore}% → ${tailoredScore}% · ${changesWithIds.length} changes`,
    )

    await admin
      .from('jobs')
      .update({ tailoring_status: 'tailored', updated_at: new Date().toISOString() })
      .eq('id', run.job_id)
      .eq('user_id', userId)

    await insertNotifications(admin, [
      buildTailorCompleteNotification(
        userId,
        `${job.title || 'Role'} @ ${job.company || 'Company'}`,
        tailoredRow.id,
      ),
    ])

    await patchTailorRun(admin, runId, {
      status: 'needs_review',
      tailored_resume_id: tailoredRow.id,
      claude_calls: Math.min(TAILOR_RUN_CLAUDE.total, (run.claude_calls || 0) + TAILOR_RUN_CLAUDE.generate),
      process_log: log.entries,
      error: null,
      finished_at: new Date().toISOString(),
    })
  } catch (err) {
    await failRun(runId, log, err instanceof Error ? err.message : 'Tailor failed')
  }
}
