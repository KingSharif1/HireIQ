import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { getMasterResumeContext } from '@/lib/profile/master'
import { formatGitHubContextForAi } from '@/lib/profile/github-context'
import type { GitHubProfileData } from '@/lib/github/types'
import { createProcessLog } from '@/lib/tailor/process-log'

export const runtime = 'nodejs'
export const maxDuration = 15

/** Fast DB-only context for tailor — no Claude. */
export async function GET(request: Request) {
  const log = createProcessLog()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobId = new URL(request.url).searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const [master, jobRes, profileRes] = await Promise.all([
    getMasterResumeContext(supabase, user.id, null),
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

  const job = jobRes.data?.extracted_data
  if (!job) {
    log.fail('Load job', 'Job missing extracted requirements')
    return NextResponse.json({ error: 'Job not found', processLog: log.entries }, { status: 404 })
  }

  const resume = master.structured
  const score = calculateATSScore(resume, job)
  const ghData = profileRes.data?.github_data as GitHubProfileData | null | undefined
  const ghRepos = ghData?.repos?.length ?? 0

  log.step(
    'Loaded from database',
    `${master.source} resume · ${resume.experience?.length ?? 0} roles · job "${job.title || 'Role'}" · GitHub ${ghRepos} repos`,
  )
  log.step(
    'ATS baseline (instant)',
    `${score.total}% match · ${score.missing_skills.length} skill gaps · ${score.missing_keywords.length} keyword gaps`,
  )

  return NextResponse.json({
    baseResumeId: master.baseResumeId,
    source: master.source,
    jobTitle: job.title,
    company: job.company,
    atsScore: score.total,
    missingSkills: score.missing_skills.slice(0, 8),
    githubRepoCount: ghRepos,
    hasGitHubContext: ghRepos > 0,
    processLog: log.entries,
  })
}
