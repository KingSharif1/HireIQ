import { createClient } from '@/lib/supabase/server'
import { COVER_LETTER_PROMPT } from '@/lib/ai/prompts'
import { NextResponse } from 'next/server'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { streamAiText } from '@/lib/ai/complete'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { beginAiOnce, endAiOnce, AI_IN_FLIGHT_MESSAGE } from '@/lib/ai/once'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let ai
  try {
    ai = await resolveAiRuntime(user.id)
  } catch (err) {
    return aiErrorResponse(err, 'AI is not configured')
  }

  const { tailoredResumeId } = await request.json()

  const { data: tailoredRow } = await supabase
    .from('tailored_resumes')
    .select('structured_data, job_id')
    .eq('id', tailoredResumeId)
    .eq('user_id', user.id)
    .single()

  if (!tailoredRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: jobRow } = await supabase
    .from('jobs')
    .select('extracted_data')
    .eq('id', tailoredRow.job_id)
    .single()

  const resume = tailoredRow.structured_data
  const job = jobRow?.extracted_data

  const topExperiences = resume.experience
    .slice(0, 2)
    .map((e: { company: string; title: string; bullets: string[] }) => `${e.title} at ${e.company}: ${e.bullets.slice(0, 2).join(' ')}`)
    .join('\n')

  const candidateInfo = `
Name: ${resume.contact?.name}
Email: ${resume.contact?.email}
Current/Recent: ${resume.experience?.[0]?.title} at ${resume.experience?.[0]?.company}
Summary: ${resume.summary || 'Not provided'}
  `.trim()

  const prompt = COVER_LETTER_PROMPT
    .replace('{candidateInfo}', candidateInfo)
    .replace('{jobAnalysis}', JSON.stringify(job, null, 2).slice(0, 1500))
    .replace('{topExperiences}', topExperiences)

  const lockKey = `cover-letter:${user.id}:${tailoredResumeId}`
  if (!beginAiOnce(lockKey)) {
    return NextResponse.json({ error: AI_IN_FLIGHT_MESSAGE }, { status: 429 })
  }

  try {
    const result = streamAiText({
      runtime: ai,
      feature: 'cover_letter',
      tier: 'strong',
      prompt,
      maxOutputTokens: 1024,
      onSettled: () => endAiOnce(lockKey),
      onText: async (text) => {
        try {
          const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
          await supabase
            .from('tailored_resumes')
            .update({ cover_letter: parsed.cover_letter || text })
            .eq('id', tailoredResumeId)
        } catch {
          await supabase
            .from('tailored_resumes')
            .update({ cover_letter: text })
            .eq('id', tailoredResumeId)
        }
      },
    })

    return result.toTextStreamResponse({
      headers: {
        'X-HireIQ-Model': ai.models.strong,
        'X-HireIQ-Key-Source': ai.keySource,
      },
    })
  } catch (err) {
    endAiOnce(lockKey)
    return aiErrorResponse(err, 'Failed to generate cover letter')
  }
}
