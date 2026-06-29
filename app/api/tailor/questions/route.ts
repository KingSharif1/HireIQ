import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { GAP_ANALYSIS_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { AI_MODELS } from '@/lib/ai/models'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { normalizeGapAnalysis } from '@/lib/ai/gap-analysis'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { getMasterResumeContext } from '@/lib/profile/master'

export const runtime = 'nodejs'
export const maxDuration = 45

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { resumeId, jobId } = await request.json()
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const master = await getMasterResumeContext(supabase, user.id, resumeId)
  if ('error' in master) {
    return NextResponse.json({ error: master.error }, { status: master.status })
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('extracted_data')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (!job?.extracted_data) {
    return NextResponse.json({ error: 'Resume or job not found' }, { status: 404 })
  }

  const resume = master.structured
  const jobData = job.extracted_data

  const score = calculateATSScore(resume, jobData)
  const gaps = [
    ...score.missing_skills.slice(0, 5).map(s => `Missing skill: ${s}`),
    ...score.missing_keywords.slice(0, 5).map(k => `Missing keyword: ${k}`),
  ].join('\n')

  const prompt = GAP_ANALYSIS_PROMPT
    .replace('{structuredResume}', JSON.stringify(resume, null, 2).slice(0, 4000))
    .replace('{jobRequirements}', JSON.stringify(jobData, null, 2).slice(0, 2000))
    .replace('{gaps}', gaps || 'No major gaps identified from ATS pre-scan')

  let gapAnalysis
  try {
    const result = await generateText({
      model: anthropic(AI_MODELS.strong),
      prompt,
      maxOutputTokens: 2500,
    })
    gapAnalysis = normalizeGapAnalysis(JSON.parse(extractJSON(result.text)))
  } catch (err) {
    return aiErrorResponse(err, 'Failed to analyze gaps')
  }

  return NextResponse.json({
    gapAnalysis,
    questions: gapAnalysis.questions_for_user,
    source: master.source,
    baseResumeId: master.baseResumeId,
  })
}
