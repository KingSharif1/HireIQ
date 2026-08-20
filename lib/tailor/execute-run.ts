import { GAP_ANALYSIS_PROMPT } from '@/lib/ai/prompts'
import { parseModelJson } from '@/lib/ai/parse-json'
import { streamAiTextToCompletion } from '@/lib/ai/complete'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { withAiOnce } from '@/lib/ai/once'
import { normalizeGapAnalysis } from '@/lib/ai/gap-analysis'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { getMasterResumeContext } from '@/lib/profile/master'
import { buildTailorPromptContext } from '@/lib/profile/tailor-context'
import { formatGitHubContextForAi } from '@/lib/profile/github-context'
import type { GitHubProfileData } from '@/lib/github/types'
import { jsonForPrompt } from '@/lib/ai/tailor-engine'
import { runTailorPipeline } from '@/lib/ai/tailor-pipeline'
import type { GenerateFn } from '@/lib/ai/tailor-types'
import { gapAnalysisFromAts, withAtsFallbackQuestions } from '@/lib/tailor/ats-gap-hints'
import { withChangeIds, initialDecisions } from '@/lib/tailor/change-decisions'
import { createProcessLog } from '@/lib/tailor/process-log'
import { buildTailorCompleteNotification } from '@/lib/notifications'
import { insertNotifications } from '@/lib/supabase/queries'
import { createAdminClient } from '@/lib/supabase/admin'
import { claimGapPhase, claimGeneratePhase, getTailorRun, patchTailorRun } from '@/lib/tailor/runs'
import { TAILOR_RUN_CLAUDE } from '@/lib/tailor/run-types'
import { userFacingTailorError } from '@/lib/tailor/user-error'
import { streamingResumeProgress } from '@/lib/resume/markdown'
import {
  applyDensity,
  DEFAULT_RESUME_THEME,
  type ResumeThemeOverride,
} from '@/lib/export/theme'
import type { GapAnalysis } from '@/types'

function defaultThemeForSeniority(seniority: string | undefined): ResumeThemeOverride {
  const s = (seniority || '').toLowerCase()
  const early = ['intern', 'internship', 'early', 'new grad', 'entry', 'junior', 'associate'].some(
    level => s.includes(level)
  )
  const base = early
    ? applyDensity({ ...DEFAULT_RESUME_THEME }, 'compact')
    : { ...DEFAULT_RESUME_THEME }
  return {
    skillsLayout: 'categorized',
    sectionOrder: [...base.sectionOrder],
    bodyFontSize: base.bodyFontSize,
    nameFontSize: base.nameFontSize,
    lineHeight: base.lineHeight,
    listLineHeight: base.listLineHeight,
    entrySpacing: base.entrySpacing,
    contentSpacing: base.contentSpacing,
    marginX: base.marginX,
    marginY: base.marginY,
  }
}

async function failRun(runId: string, log: ReturnType<typeof createProcessLog>, err: unknown) {
  const technical = err instanceof Error ? err.message : String(err)
  console.error('[tailor]', technical, err)
  const facing = userFacingTailorError(technical)
  log.fail(facing.title, facing.message)
  await patchTailorRun(createAdminClient(), runId, {
    status: 'failed',
    error: facing.message,
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
  log.step('Loaded your profile', 'Pulled your resume and this job from the database')

  const [master, jobRes, profileRes, enhancementsRes] = await Promise.all([
    getMasterResumeContext(admin, userId, null),
    admin.from('jobs').select('extracted_data').eq('id', run.job_id).eq('user_id', userId).single(),
    admin.from('profiles').select('github_data').eq('id', userId).maybeSingle(),
    admin
      .from('resume_enhancements')
      .select('question, answer')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15),
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
  const priorEnhancements = (enhancementsRes.data ?? []).map(row => ({
    question: row.question,
    answer: row.answer,
  }))
  const { resumeMarkdown, profileContext } = buildTailorPromptContext({
    master,
    priorEnhancements,
  })
  log.step(
    'Context ready',
    `${jobData.title || 'Role'} at ${jobData.company || 'this company'}`,
  )

  const atsGap = gapAnalysisFromAts(score)
  const shouldAskClaude =
    atsGap.real_gaps.length > 0 || score.missing_skills.length > 0 || score.missing_keywords.length > 0

  if (!shouldAskClaude) {
    log.step('No extra questions', 'Your profile already covers the main requirements — writing a version next.')
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
    .replace('{resumeMarkdown}', resumeMarkdown)
    .replace('{profileContext}', profileContext)
    .replace('{githubContext}', githubContext)
    .replace('{jobRequirements}', jsonForPrompt(jobData))
    .replace('{gaps}', gaps || 'No major gaps identified from ATS pre-scan')

  log.step('Reviewing this job', 'Comparing your experience to what they’re asking for', 'pending')
  let gapAnalysis: GapAnalysis
  try {
    const result = await withAiOnce(`gap_questions:${userId}:${run.job_id}`, () =>
      streamAiTextToCompletion({
        runtime: ai,
        feature: 'gap_questions',
        tier: 'strong',
        prompt,
        maxOutputTokens: 4000,
        partialEveryMs: 1000,
        onPartial: async text => {
          const last = log.entries[log.entries.length - 1]
          if (!last || last.status !== 'pending') return
          const detail = text.includes('questions_for_user')
            ? 'Choosing questions to ask you'
            : text.includes('real_gaps')
              ? 'Finding real gaps'
              : text.includes('adjacent_matches')
                ? 'Checking adjacent matches'
                : text.includes('direct_matches')
                  ? 'Listing direct matches'
                  : 'Comparing your experience to what they’re asking for'
          if (last.detail === detail) return
          last.detail = detail
          await patchTailorRun(admin, runId, { process_log: log.entries })
        },
      }),
    )
    let parsed: GapAnalysis
    try {
      parsed = normalizeGapAnalysis(parseModelJson(result.text))
    } catch (parseErr) {
      console.error('[tailor] gap JSON unusable, falling back to ATS questions', parseErr)
      parsed = atsGap
      const last = log.entries[log.entries.length - 1]
      if (last?.status === 'pending') {
        last.status = 'warn'
        last.label = 'Review complete'
        last.detail = 'Used the job requirements when the detailed review came back messy'
      }
    }
    gapAnalysis = withAtsFallbackQuestions(parsed, score)
    const last = log.entries[log.entries.length - 1]
    if (last && last.status === 'pending') {
      last.status = 'ok'
      last.label = 'Review complete'
      last.detail =
        gapAnalysis.questions_for_user.length > 0
          ? 'A couple of questions to make this stronger'
          : 'Ready to write your version'
    }
    await patchTailorRun(admin, runId, {
      claude_calls: TAILOR_RUN_CLAUDE.gap,
      process_log: log.entries,
    })
  } catch (err) {
    await failRun(runId, log, err)
    return
  }

  const questions = gapAnalysis.questions_for_user
  if (questions.length === 0) {
    log.step('No extra questions', 'Starting the tailored version')
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

/** Claude call 2 of 2: one resume rewrite as markdown (streamed; retries once if unusable). */
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
  log.step('Writing your version', 'Keeping your voice, aimed at this job')

  let ai
  try {
    ai = await resolveAiRuntime(userId)
  } catch (err) {
    await failRun(runId, log, err instanceof Error ? err.message : 'AI is not configured')
    return
  }

  const [master, jobRes, profileRes, enhancementsRes] = await Promise.all([
    getMasterResumeContext(admin, userId, null),
    admin.from('jobs').select('extracted_data').eq('id', run.job_id).eq('user_id', userId).single(),
    admin.from('profiles').select('github_data').eq('id', userId).maybeSingle(),
    admin
      .from('resume_enhancements')
      .select('question, answer')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15),
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
  const priorEnhancements = (enhancementsRes.data ?? []).map(row => ({
    question: row.question,
    answer: row.answer,
  }))
  const { resumeMarkdown, profileContext } = buildTailorPromptContext({
    master,
    priorEnhancements,
  })
  const gapAnalysis = run.gap_analysis ?? gapAnalysisFromAts(calculateATSScore(master.structured, job))
  const questionLabels: Record<string, string> = {}
  for (const q of run.questions) {
    if (q?.id && q?.question) questionLabels[q.id] = q.question
  }

  const generateFn: GenerateFn = async ({ model, prompt, maxOutputTokens }) => {
    log.step('Writing your version', 'Matching this job in your words', 'pending')
    await patchTailorRun(admin, runId, { process_log: log.entries })
    const result = await streamAiTextToCompletion({
      runtime: ai,
      feature: 'tailor_resume',
      tier: 'strong',
      prompt,
      maxOutputTokens,
      modelOverride: model,
      partialEveryMs: 1000,
      onPartial: async text => {
        const last = log.entries[log.entries.length - 1]
        if (!last || last.status !== 'pending') return
        const detail = streamingResumeProgress(text)
        if (last.detail === detail) return
        last.detail = detail
        await patchTailorRun(admin, runId, { process_log: log.entries })
      },
    })
    const last = log.entries[log.entries.length - 1]
    if (last?.status === 'pending') {
      last.status = 'ok'
      last.label = 'Draft ready'
      last.detail = 'Scoring match next'
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
        profileContext,
        resumeMarkdown,
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
        theme_override: defaultThemeForSeniority(job.seniority),
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
      claude_calls: Math.min(
        TAILOR_RUN_CLAUDE.total,
        (run.claude_calls || 0) + Math.max(1, pipelineResult.meta.aiCallsUsed),
      ),
      process_log: log.entries,
      error: null,
      finished_at: new Date().toISOString(),
    })
  } catch (err) {
    await failRun(runId, log, err)
  }
}
