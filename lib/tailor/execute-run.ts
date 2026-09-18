import { streamAiTextToCompletion } from '@/lib/ai/complete'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { withAiOnce } from '@/lib/ai/once'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { getMasterResumeContext } from '@/lib/profile/master'
import { buildTailorPromptContext } from '@/lib/profile/tailor-context'
import { formatGitHubContextForAi } from '@/lib/profile/github-context'
import { loadLatestReadyIntelligence } from '@/lib/github/intelligence-store'
import type { GitHubProfileData } from '@/lib/github/types'
import { runTailorPipeline } from '@/lib/ai/tailor-pipeline'
import type { GenerateFn } from '@/lib/ai/tailor-types'
import {
  gapAnalysisFromAts,
  leftoverGapChips,
} from '@/lib/tailor/ats-gap-hints'
import { formatPreferredProjectsForPrompt } from '@/lib/tailor/job-relevance'
import { themeOverrideForJob } from '@/lib/tailor/job-structure'
import { withChangeIds, initialDecisions } from '@/lib/tailor/change-decisions'
import { createProcessLog } from '@/lib/tailor/process-log'
import { buildTailorCompleteNotification } from '@/lib/notifications'
import { insertNotifications } from '@/lib/supabase/queries'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  claimGapPhase,
  claimGeneratePhase,
  claimWeavePhase,
  getTailorRun,
  patchTailorRun,
} from '@/lib/tailor/runs'
import { TAILOR_RUN_CLAUDE } from '@/lib/tailor/run-types'
import { userFacingTailorError } from '@/lib/tailor/user-error'
import { streamingResumeProgress } from '@/lib/resume/markdown'
import type { JobExtractedData } from '@/types'
import {
  applyDensity,
  DEFAULT_RESUME_THEME,
  type ResumeThemeOverride,
} from '@/lib/export/theme'

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

function themeForJob(job: JobExtractedData): ResumeThemeOverride {
  return themeOverrideForJob(job) ?? defaultThemeForSeniority(job.seniority)
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

/**
 * Draft-first (Task 162): no pre-draft Claude gap call.
 * Loads context, stores ATS gap analysis, then generates immediately.
 * Legacy `awaiting_answers` runs still continue via the continue route.
 */
export async function executeGapPhase(runId: string, userId: string): Promise<void> {
  const admin = createAdminClient()
  const existing = await getTailorRun(admin, userId, runId)
  if (!existing) return
  if (existing.status !== 'analyzing_gaps') return

  const run = await claimGapPhase(admin, runId)
  if (!run) return

  const log = createProcessLog()
  log.step('Loaded your profile', 'Pulled your resume and this job from the database')

  const [master, jobRes] = await Promise.all([
    getMasterResumeContext(admin, userId, null),
    admin.from('jobs').select('extracted_data').eq('id', run.job_id).eq('user_id', userId).single(),
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
  const atsGap = gapAnalysisFromAts(score)

  log.step(
    'Context ready',
    `${jobData.title || 'Role'} at ${jobData.company || 'this company'} — drafting first, optional gaps after`,
  )
  log.step('No pre-draft quiz', 'Writing a full version from your profile and this job')

  await patchTailorRun(admin, runId, {
    status: 'generating',
    gap_analysis: atsGap,
    questions: [],
    process_log: log.entries,
  })
  await executeGeneratePhase(runId, userId, {})
}

/** One resume rewrite as markdown (streamed). Also used for the optional post-draft weave. */
export async function executeGeneratePhase(
  runId: string,
  userId: string,
  answers: Record<string, string>,
): Promise<void> {
  const admin = createAdminClient()
  const existing = await getTailorRun(admin, userId, runId)
  if (!existing) return
  if (existing.status === 'failed' || existing.status === 'cancelled') {
    return
  }

  const isWeave = existing.status === 'needs_review'
  if (isWeave && existing.claude_calls >= TAILOR_RUN_CLAUDE.total) {
    return
  }

  const run = isWeave
    ? await claimWeavePhase(admin, runId, answers)
    : await claimGeneratePhase(admin, runId, answers)
  if (!run) return

  const log = createProcessLog()
  for (const entry of run.process_log) log.entries.push(entry)
  log.step(
    isWeave ? 'Weaving in your answers' : 'Writing your version',
    isWeave ? 'Updating the draft with what you shared' : 'Keeping your voice, aimed at this job',
  )

  let ai
  try {
    ai = await resolveAiRuntime(userId)
  } catch (err) {
    await failRun(runId, log, err instanceof Error ? err.message : 'AI is not configured')
    return
  }

  const [master, jobRes, profileRes, enhancementsRes, repoIntelligence] = await Promise.all([
    getMasterResumeContext(admin, userId, null),
    admin.from('jobs').select('extracted_data').eq('id', run.job_id).eq('user_id', userId).single(),
    admin.from('profiles').select('github_data').eq('id', userId).maybeSingle(),
    admin
      .from('resume_enhancements')
      .select('question, answer')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15),
    loadLatestReadyIntelligence(admin, userId),
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
    {
      profileData: master.profileData,
      job,
      intelligenceByRepoId: repoIntelligence,
    }
  )
  const priorEnhancements = (enhancementsRes.data ?? []).map(row => ({
    question: row.question,
    answer: row.answer,
  }))
  const { resumeMarkdown, profileContext } = buildTailorPromptContext({
    master,
    priorEnhancements,
  })
  const preferredProjects = formatPreferredProjectsForPrompt(
    master.profileData?.projects ?? master.structured.projects ?? [],
    job,
  )
  const enrichedProfileContext = preferredProjects
    ? `${profileContext}\n\n${preferredProjects}`
    : profileContext
  const gapAnalysis = run.gap_analysis ?? gapAnalysisFromAts(calculateATSScore(master.structured, job))
  const questionLabels: Record<string, string> = {}
  for (const q of run.questions) {
    if (q?.id && q?.question) questionLabels[q.id] = q.question
  }

  const mergedAnswers = { ...(run.answers ?? {}), ...answers }

  const generateFn: GenerateFn = async ({ model, prompt, maxOutputTokens }) => {
    log.step(
      isWeave ? 'Weaving in your answers' : 'Writing your version',
      isWeave ? 'Updating the draft' : 'Matching this job in your words',
      'pending',
    )
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
      last.label = isWeave ? 'Update ready' : 'Draft ready'
      last.detail = 'Scoring match next'
    }
    return result.text
  }

  try {
    const pipelineResult = await withAiOnce(
      isWeave ? `tailor-weave:${userId}:${run.job_id}` : `tailor-generate:${userId}:${run.job_id}`,
      () =>
        runTailorPipeline({
          resume: master.structured,
          job,
          answers: mergedAnswers,
          questionLabels,
          gapAnalysis,
          githubContext,
          profileContext: enrichedProfileContext,
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

    const gapAnswersRecord = Object.entries(mergedAnswers)
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
        theme_override: themeForJob(job),
      })
      .select('id, version')
      .single()

    if (dbErr || !tailoredRow) {
      await failRun(runId, log, dbErr?.message || 'Failed to save tailored resume')
      return
    }

    // Post-draft optional chips only after the first draft (not after weave).
    const chips = isWeave ? [] : leftoverGapChips(calculateATSScore(tailoredResume, job))

    log.step(
      'Ready to review',
      chips.length > 0
        ? `v${tailoredRow.version} · ${matchScore}% → ${tailoredScore}% · ${chips.length} optional tip${chips.length === 1 ? '' : 's'}`
        : `v${tailoredRow.version} · ${matchScore}% → ${tailoredScore}% · ${changesWithIds.length} changes`,
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

    const nextCalls = Math.min(
      TAILOR_RUN_CLAUDE.total,
      (run.claude_calls || 0) + Math.max(1, pipelineResult.meta.aiCallsUsed),
    )

    await patchTailorRun(admin, runId, {
      status: 'needs_review',
      tailored_resume_id: tailoredRow.id,
      questions: chips,
      answers: isWeave ? mergedAnswers : {},
      claude_calls: nextCalls,
      process_log: log.entries,
      error: null,
      finished_at: new Date().toISOString(),
    })
  } catch (err) {
    await failRun(runId, log, err)
  }
}
