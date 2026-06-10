import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { JOB_ANALYZER_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { aiErrorResponse } from '@/lib/ai/error-response'
import type { JobExtractedData } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { description, source, company, title, location, applyUrl } = await request.json()
  if (!description) return NextResponse.json({ error: 'Job description required' }, { status: 400 })

  const prompt = JOB_ANALYZER_PROMPT.replace('{jobDescription}', description.slice(0, 10000))

  let extractedData: JobExtractedData
  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt,
      maxOutputTokens: 2048,
    })
    extractedData = JSON.parse(extractJSON(result.text))
  } catch (err) {
    return aiErrorResponse(err, 'Failed to analyze job description')
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

  return NextResponse.json({ jobId: jobRow.id, extractedData })
}
