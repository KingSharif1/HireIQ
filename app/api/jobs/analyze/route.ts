import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JOB_ANALYZER_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { streamAiTextToCompletion } from '@/lib/ai/complete'
import { withAiOnce } from '@/lib/ai/once'
import { ndjsonResponse, streamingJobProgress } from '@/lib/ai/ndjson-stream'
import { parseModelJson } from '@/lib/ai/parse-json'
import { classifyApplyEase, type ApplyEaseResult } from '@/lib/apply/ease'
import type { JobExtractedData } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

type AnalyzeDone = {
  jobId: string
  extractedData: JobExtractedData
  model: string
  keySource: string
}

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

  return ndjsonResponse<AnalyzeDone>(async emit => {
    emit({ type: 'progress', detail: 'Analyzing this job' })

    const extractedBase = await withAiOnce(`job_analyze:${user.id}`, async () => {
      const result = await streamAiTextToCompletion({
        runtime: ai,
        feature: 'job_analyze',
        tier: 'strong',
        prompt,
        maxOutputTokens: 2048,
        partialEveryMs: 700,
        onPartial: text => {
          emit({ type: 'progress', detail: streamingJobProgress(text) })
        },
      })
      try {
        return parseModelJson<JobExtractedData>(result.text)
      } catch {
        return JSON.parse(extractJSON(result.text)) as JobExtractedData
      }
    })

    emit({ type: 'progress', detail: 'Saving to your tracker' })

    const ease =
      applyEase && (applyEase.ease === 'easy' || applyEase.ease === 'hard' || applyEase.ease === 'unknown')
        ? applyEase
        : classifyApplyEase({ url: applyUrl })
    const resolvedApplyUrl = ease.detectedApplyUrl || applyUrl || null
    const extractedData: JobExtractedData = {
      ...extractedBase,
      apply_ease: ease.ease,
      apply_ease_reason: ease.reason,
    }

    const { data: jobRow, error: dbErr } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        source: source || 'manual',
        company: company || extractedData.company || 'Unknown',
        title: title || extractedData.title || 'Unknown Role',
        description: description.slice(0, 50000),
        location: location || null,
        apply_url: resolvedApplyUrl,
        extracted_data: extractedData,
      })
      .select()
      .single()

    if (dbErr || !jobRow) throw new Error('Failed to save job')

    emit({
      type: 'done',
      jobId: jobRow.id,
      extractedData,
      model: ai.models.strong,
      keySource: ai.keySource,
    })
  })
}
