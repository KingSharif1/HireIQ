import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GAP_ANALYSIS_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { generateAiText } from '@/lib/ai/complete'
import { normalizeGapAnalysis } from '@/lib/ai/gap-analysis'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { getMasterResumeContext } from '@/lib/profile/master'
import { formatGitHubContextForAi } from '@/lib/profile/github-context'
import type { GitHubProfileData } from '@/lib/github/types'
import { createProcessLog } from '@/lib/tailor/process-log'

export const runtime = 'nodejs'
export const maxDuration = 45

export async function POST(request: Request) {
  const log = createProcessLog()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  log.step('Authenticated')

  const { resumeId, jobId } = await request.json()
  if (!jobId) return NextResponse.json({ error: 'jobId required', processLog: log.entries }, { status: 400 })
  log.step('Request validated', `jobId ${jobId.slice(0, 8)}…`)

  const [master, jobRes, profileRes] = await Promise.all([
    getMasterResumeContext(supabase, user.id, resumeId),
    supabase
      .from('jobs')
      .select('extracted_data')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single(),
    supabase.from('profiles').select('github_data').eq('id', user.id).maybeSingle(),
  ])

  if ('error' in master) {
    log.fail('Load profile/resume', master.error)
    return NextResponse.json({ error: master.error, processLog: log.entries }, { status: master.status })
  }

  const job = jobRes.data
  if (!job?.extracted_data) {
    log.fail('Load job', 'Job missing extracted requirements — re-analyze the posting first')
    return NextResponse.json(
      { error: 'Resume or job not found', processLog: log.entries },
      { status: 404 },
    )
  }

  const resume = master.structured
  const jobData = job.extracted_data
  const expCount = resume.experience?.length ?? 0
  const projCount = resume.projects?.length ?? 0
  log.step(
    'Loaded master resume',
    `${master.source} · ${expCount} roles · ${projCount} projects`,
  )
  log.step(
    'Loaded job requirements',
    `${jobData.title || 'Role'} @ ${jobData.company || 'Company'} · ${jobData.required_skills?.length ?? 0} required skills`,
  )

  const githubData = profileRes.data?.github_data as GitHubProfileData | null | undefined
  const githubContext = formatGitHubContextForAi(githubData ?? null)
  const ghRepos = githubData?.repos?.length ?? 0
  if (ghRepos > 0) {
    log.step('Loaded GitHub context', `${ghRepos} synced repos included in analysis`)
  } else {
    log.step('GitHub context', 'No synced repos — using resume/profile only', 'warn')
  }

  const score = calculateATSScore(resume, jobData)
  log.step(
    'ATS pre-scan',
    `Baseline ${score.total}% · ${score.missing_skills.length} skill gaps · ${score.missing_keywords.length} keyword gaps`,
  )

  const gaps = [
    ...score.missing_skills.slice(0, 5).map(s => `Missing skill: ${s}`),
    ...score.missing_keywords.slice(0, 5).map(k => `Missing keyword: ${k}`),
  ].join('\n')

  const prompt = GAP_ANALYSIS_PROMPT
    .replace('{structuredResume}', JSON.stringify(resume, null, 2))
    .replace('{githubContext}', githubContext)
    .replace('{jobRequirements}', JSON.stringify(jobData, null, 2))
    .replace('{gaps}', gaps || 'No major gaps identified from ATS pre-scan')

  let ai
  try {
    ai = await resolveAiRuntime(user.id)
    log.step(
      'AI configured',
      `${ai.keySource === 'byok' ? 'Your Anthropic key' : 'HireIQ key'} · model ${ai.models.strong}`,
    )
  } catch (err) {
    log.fail('AI configuration', err instanceof Error ? err.message : 'Not configured')
    return aiErrorResponse(err, 'AI is not configured', log.entries)
  }

  let gapAnalysis
  try {
    log.step('Claude gap analysis', 'Comparing profile to job…', 'pending')
    const result = await generateAiText({
      runtime: ai,
      feature: 'gap_questions',
      tier: 'strong',
      prompt,
      maxOutputTokens: 2500,
    })
    gapAnalysis = normalizeGapAnalysis(JSON.parse(extractJSON(result.text)))
    log.entries[log.entries.length - 1] = {
      ...log.entries[log.entries.length - 1],
      status: 'ok',
      label: 'Claude gap analysis complete',
      detail: `${gapAnalysis.direct_matches.length} direct · ${gapAnalysis.adjacent_matches.length} adjacent · ${gapAnalysis.real_gaps.length} gaps · ${gapAnalysis.questions_for_user.length} questions`,
    }
  } catch (err) {
    log.fail('Claude gap analysis', err instanceof Error ? err.message : 'Model call failed')
    return aiErrorResponse(err, 'Failed to analyze gaps', log.entries)
  }

  log.step('Ready for questions', `baseResumeId ${master.baseResumeId.slice(0, 8)}…`)

  return NextResponse.json({
    gapAnalysis,
    questions: gapAnalysis.questions_for_user,
    source: master.source,
    baseResumeId: master.baseResumeId,
    model: ai.models.strong,
    keySource: ai.keySource,
    processLog: log.entries,
  })
}
