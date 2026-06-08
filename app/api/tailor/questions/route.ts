import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { QUESTION_GENERATOR_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import type { GapQuestion } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { resumeId, jobId } = await request.json()

  const [resumeRes, jobRes] = await Promise.all([
    supabase.from('resumes').select('structured_data').eq('id', resumeId).eq('user_id', user.id).single(),
    supabase.from('jobs').select('extracted_data').eq('id', jobId).eq('user_id', user.id).single(),
  ])

  if (!resumeRes.data || !jobRes.data?.extracted_data) {
    return NextResponse.json({ error: 'Resume or job not found' }, { status: 404 })
  }

  const resume = resumeRes.data.structured_data
  const job = jobRes.data.extracted_data

  const score = calculateATSScore(resume, job)
  const gaps = [
    ...score.missing_skills.slice(0, 5).map(s => `Missing skill: ${s}`),
    ...score.missing_keywords.slice(0, 5).map(k => `Missing keyword: ${k}`),
  ].join('\n')

  const prompt = QUESTION_GENERATOR_PROMPT
    .replace('{structuredResume}', JSON.stringify(resume, null, 2).slice(0, 4000))
    .replace('{jobRequirements}', JSON.stringify(job, null, 2).slice(0, 2000))
    .replace('{gaps}', gaps || 'No major gaps identified — help surface any relevant achievements')

  let questions: GapQuestion[]
  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt,
      maxOutputTokens: 1500,
    })
    const parsed = JSON.parse(extractJSON(result.text))
    questions = parsed.questions || []
  } catch {
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
  }

  return NextResponse.json({ questions })
}
