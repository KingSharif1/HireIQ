import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { COVER_LETTER_PROMPT } from '@/lib/ai/prompts'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

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

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    prompt,
    maxOutputTokens: 1024,
    onFinish: async ({ text }) => {
      // Save streaming result to DB when done
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

  return result.toTextStreamResponse()
}
