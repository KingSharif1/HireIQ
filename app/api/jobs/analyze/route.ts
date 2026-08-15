import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JOB_ANALYZER_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { generateAiText } from '@/lib/ai/complete'
import { withAiOnce, AiInFlightError } from '@/lib/ai/once'
import { classifyApplyEase, type ApplyEaseResult } from '@/lib/apply/ease'
import type { JobExtractedData } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { description, source, company, title, location, applyUrl, applyEase } = await request.json() as {
    description?: string
    source?: string
    company?: string
    title?: string
    location?: string
    applyUrl?: string
    applyEase?: ApplyEaseResult
  }
  if (!description) return NextResponse.json({ error: 'Job description required' }, { status: 400 })

  let ai
  try {
    ai = await resolveAiRuntime(user.id)
  } catch (err) {
    return aiErrorResponse(err, 'AI is not configured')
  }

  const prompt = JOB_ANALYZER_PROMPT.replace('{jobDescription}', description.slice(0, 10000))

  let extractedData: JobExtractedData
  try {
    extractedData = await withAiOnce(`job_analyze:${user.id}`, async () => {
      const result = await generateAiText({
        runtime: ai,
        feature: 'job_analyze',
        tier: 'strong',
        prompt,
        maxOutputTokens: 2048,
      })
      return JSON.parse(extractJSON(result.text)) as JobExtractedData
    })
  } catch (err) {
    return aiErrorResponse(err, 'Failed to analyze job description')
  }

  const ease =
    applyEase && (applyEase.ease === 'easy' || applyEase.ease === 'hard' || applyEase.ease === 'unknown')
      ? applyEase
      : classifyApplyEase({ url: applyUrl })
  extractedData = {
    ...extractedData,
    apply_ease: ease.ease,
    apply_ease_reason: ease.reason,
  }

  // Save to DB
  const { data: jobRow, error: dbErr } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      source: source || 'manual',
      company: company || extractedData.company || 'Unknown',
      title: title || extractedData.title || 'Unknown Role',
      description: description.slice(0, 50000),
      location: location || null,
      apply_url: applyUrl || null,
      extracted_data: extractedData,
    })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: 'Failed to save job' }, { status: 500 })

  return NextResponse.json({
    jobId: jobRow.id,
    extractedData,
    model: ai.models.strong,
    keySource: ai.keySource,
  })
}
