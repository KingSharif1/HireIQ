import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RESUME_PARSER_PROMPT } from '@/lib/ai/prompts'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { streamAiTextToCompletion } from '@/lib/ai/complete'
import { withAiOnce } from '@/lib/ai/once'
import { ndjsonResponse } from '@/lib/ai/ndjson-stream'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { buildProfileSeedFromParse, hasProfileContent, profileRowUpdatesFromSeed } from '@/lib/profile/master'
import { resolveProfileData } from '@/lib/profile/data'
import { hasParseAdditions, parseAdditions } from '@/lib/profile/parse-additions'
import { markdownToStructuredResume, streamingResumeProgress } from '@/lib/resume/markdown'
import type { StructuredResume, Profile } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

type ParseDone = {
  resumeId: string
  structuredData: StructuredResume
  atsFormatScore: number
  replaced: boolean
  profileSeeded: boolean
  additions: ReturnType<typeof parseAdditions>
  hasAdditions: boolean
  model: string
  keySource: string
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const title = (formData.get('title') as string) || 'My Resume'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const fileType = file.name.endsWith('.docx') ? 'docx' : 'pdf'
  const buffer = Buffer.from(await file.arrayBuffer())

  let rawText = ''
  try {
    if (fileType === 'pdf') {
      const { PDFParse } = require('pdf-parse')
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      rawText = result.text ?? ''
      await parser.destroy()
    } else {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      rawText = result.value
    }
  } catch {
    return NextResponse.json({ error: 'Failed to extract text from file' }, { status: 422 })
  }

  if (!rawText || rawText.trim().length < 50) {
    return NextResponse.json({
      error: 'Could not read text from file. Please try a different format.',
    }, { status: 422 })
  }

  const fileExt = fileType === 'pdf' ? 'pdf' : 'docx'
  const storageKey = `${user.id}/${Date.now()}.${fileExt}`
  const { data: storageData, error: storageErr } = await supabase.storage
    .from('resumes')
    .upload(storageKey, buffer, {
      contentType: fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: false,
    })

  const fileUrl = storageErr
    ? null
    : supabase.storage.from('resumes').getPublicUrl(storageData!.path).data.publicUrl

  let ai
  try {
    ai = await resolveAiRuntime(user.id)
  } catch (err) {
    return aiErrorResponse(err, 'AI is not configured')
  }

  const prompt = RESUME_PARSER_PROMPT.replace('{resumeText}', rawText.slice(0, 12000))

  return ndjsonResponse<ParseDone>(async emit => {
    emit({ type: 'progress', detail: 'Reading your resume' })

    const structuredData = await withAiOnce(`resume_parse:${user.id}`, async () => {
      const result = await streamAiTextToCompletion({
        runtime: ai,
        feature: 'resume_parse',
        tier: 'strong',
        prompt,
        maxOutputTokens: 4096,
        partialEveryMs: 800,
        onPartial: text => {
          emit({ type: 'progress', detail: streamingResumeProgress(text) })
        },
      })
      const parsed = markdownToStructuredResume(result.text)
      if (!parsed.contact.name && !parsed.summary && parsed.experience.length === 0) {
        throw new Error('Could not understand that resume. Try another file.')
      }
      return parsed
    })

    emit({ type: 'progress', detail: 'Saving to your library' })

    const fakeEmptyJob = {
      title: '', company: '', required_skills: [], preferred_skills: [],
      required_experience_years: 0, education_requirement: 'none', keywords: [],
      responsibilities: [], ats_system: '', red_flags: [], company_values: [],
      compensation: { min: null, max: null, currency: 'USD', period: 'annual' },
      work_type: 'remote', seniority: 'mid', summary: '',
    }
    const atsFormatScore = calculateATSScore(structuredData, fakeEmptyJob).breakdown.format

    const { data: existingResumes } = await supabase
      .from('resumes')
      .select('id, is_primary')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    const existing = existingResumes?.[0]
    const payload = {
      title,
      original_file_url: fileUrl,
      original_file_type: fileType,
      raw_text: rawText.slice(0, 50000),
      structured_data: structuredData,
      ats_format_score: atsFormatScore,
      is_primary: true,
      updated_at: new Date().toISOString(),
    }

    let resumeRow: { id: string } | null = null
    let replaced = false

    if (existing) {
      const { data, error: dbErr } = await supabase
        .from('resumes')
        .update(payload)
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .select('id')
        .single()
      if (dbErr || !data) throw new Error('Failed to save resume')
      resumeRow = data
      replaced = true
      await supabase
        .from('resumes')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .neq('id', existing.id)
    } else {
      const { data, error: dbErr } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          ...payload,
        })
        .select('id')
        .single()
      if (dbErr || !data) throw new Error('Failed to save resume')
      resumeRow = data
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, profile_data')
      .eq('id', user.id)
      .single<Pick<Profile, 'first_name' | 'last_name' | 'email' | 'profile_data'>>()

    const storedProfile = resolveProfileData(profileRow, null)
    const additions = parseAdditions(structuredData, storedProfile)
    let profileSeeded = false

    if (!hasProfileContent(storedProfile)) {
      const seed = buildProfileSeedFromParse(structuredData, profileRow)
      await supabase
        .from('profiles')
        .update(profileRowUpdatesFromSeed(seed, profileRow))
        .eq('id', user.id)
      profileSeeded = true
    }

    emit({
      type: 'done',
      resumeId: resumeRow.id,
      structuredData,
      atsFormatScore,
      replaced,
      profileSeeded,
      additions,
      hasAdditions: !profileSeeded && hasParseAdditions(additions),
      model: ai.models.strong,
      keySource: ai.keySource,
    })
  })
}
