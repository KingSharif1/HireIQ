import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { RESUME_TAILOR_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { diffArrays } from 'diff'
import type { StructuredResume, ResumeDiffChange } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { resumeId, jobId, answers } = await request.json() as {
    resumeId: string
    jobId: string
    answers: Record<string, string>
  }

  const [resumeRes, jobRes] = await Promise.all([
    supabase.from('resumes').select('structured_data').eq('id', resumeId).eq('user_id', user.id).single(),
    supabase.from('jobs').select('extracted_data, description').eq('id', jobId).eq('user_id', user.id).single(),
  ])

  if (!resumeRes.data || !jobRes.data?.extracted_data) {
    return NextResponse.json({ error: 'Resume or job not found' }, { status: 404 })
  }

  const resume = resumeRes.data.structured_data as StructuredResume
  const job = jobRes.data.extracted_data

  // Save answers as enhancements
  if (answers && Object.keys(answers).length > 0) {
    const enhancementRows = Object.entries(answers)
      .filter(([, answer]) => answer.trim())
      .map(([questionId, answer]) => ({
        user_id: user.id,
        category: 'experience',
        question: questionId,
        answer: answer.trim(),
        applied_to_resume: true,
      }))

    if (enhancementRows.length > 0) {
      await supabase.from('resume_enhancements').insert(enhancementRows)
    }
  }

  const enhancements = Object.entries(answers || {})
    .filter(([, a]) => a.trim())
    .map(([q, a]) => `Q: ${q}\nA: ${a}`)
    .join('\n\n') || 'No additional information provided.'

  const prompt = RESUME_TAILOR_PROMPT
    .replace('{structuredResume}', JSON.stringify(resume, null, 2).slice(0, 5000))
    .replace('{jobAnalysis}', JSON.stringify(job, null, 2).slice(0, 2000))
    .replace('{enhancements}', enhancements)
    .replace('{atsSystem}', job.ats_system || 'generic')
    .replace('{seniority}', job.seniority || 'mid')

  let tailoredResume: StructuredResume
  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt,
      maxOutputTokens: 6000,
    })
    tailoredResume = JSON.parse(extractJSON(result.text))
  } catch (err) {
    return aiErrorResponse(err, 'Failed to tailor resume')
  }

  // Compute diff
  const changes: ResumeDiffChange[] = []
  for (const exp of resume.experience) {
    const tailoredExp = tailoredResume.experience.find(e => e.id === exp.id)
    if (tailoredExp) {
      const diff = diffArrays(exp.bullets, tailoredExp.bullets)
      const hasChanges = diff.some(d => d.added || d.removed)
      if (hasChanges) {
        changes.push({
          section: 'experience',
          field: 'bullets',
          expId: exp.id,
          before: exp.bullets,
          after: tailoredExp.bullets,
        })
      }
    }
  }

  // Summary change
  if (resume.summary !== tailoredResume.summary) {
    changes.push({
      section: 'summary',
      field: 'text',
      before: resume.summary,
      after: tailoredResume.summary,
    })
  }

  // Score before and after
  const matchScore = calculateATSScore(resume, job).total
  const tailoredScore = calculateATSScore(tailoredResume, job).total

  const { data: tailoredRow, error: dbErr } = await supabase
    .from('tailored_resumes')
    .insert({
      user_id: user.id,
      base_resume_id: resumeId,
      job_id: jobId,
      structured_data: tailoredResume,
      changes,
      match_score: matchScore,
      tailored_score: tailoredScore,
    })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: 'Failed to save tailored resume' }, { status: 500 })

  return NextResponse.json({
    tailoredResumeId: tailoredRow.id,
    tailoredData: tailoredResume,
    changes,
    matchScore,
    tailoredScore,
  })
}
