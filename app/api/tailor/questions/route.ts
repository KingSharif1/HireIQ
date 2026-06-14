import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { QUESTION_GENERATOR_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { AI_MODELS } from '@/lib/ai/models'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { getMasterResumeContext } from '@/lib/profile/master'
import type { GapQuestion } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

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

  const prompt = QUESTION_GENERATOR_PROMPT
    .replace('{structuredResume}', JSON.stringify(resume, null, 2).slice(0, 4000))
    .replace('{jobRequirements}', JSON.stringify(jobData, null, 2).slice(0, 2000))
    .replace('{gaps}', gaps || 'No major gaps identified — help surface any relevant achievements')

  let questions: GapQuestion[]
  try {
    const result = await generateText({
      model: anthropic(AI_MODELS.strong),
      prompt,
      maxOutputTokens: 1500,
    })
    const parsed = JSON.parse(extractJSON(result.text))
    questions = parsed.questions || []
  } catch (err) {
    return aiErrorResponse(err, 'Failed to generate questions')
  }

  return NextResponse.json({ questions, source: master.source, baseResumeId: master.baseResumeId })
}
