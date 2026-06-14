import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { RESUME_PARSER_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { AI_MODELS } from '@/lib/ai/models'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { buildProfileSeedFromParse, profileRowUpdatesFromSeed } from '@/lib/profile/master'
import type { StructuredResume, Profile } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

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

  // Extract text
  let rawText = ''
  try {
    if (fileType === 'pdf') {
      // pdf-parse v2 uses class-based API — PDFParse({ data }) then .getText()
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
    return NextResponse.json({ error: 'Could not read text from file. Please try a different format.' }, { status: 422 })
  }

  // Upload original file to Supabase Storage
  const fileExt = fileType === 'pdf' ? 'pdf' : 'docx'
  const storageKey = `${user.id}/${Date.now()}.${fileExt}`
  const { data: storageData, error: storageErr } = await supabase.storage
    .from('resumes')
    .upload(storageKey, buffer, {
      contentType: fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: false,
    })

  const fileUrl = storageErr ? null : supabase.storage.from('resumes').getPublicUrl(storageData!.path).data.publicUrl

  // Claude parsing
  const prompt = RESUME_PARSER_PROMPT.replace('{resumeText}', rawText.slice(0, 12000))

  let structuredData: StructuredResume
  try {
    const result = await generateText({
      model: anthropic(AI_MODELS.strong),
      prompt,
      maxOutputTokens: 4096,
    })
    structuredData = JSON.parse(extractJSON(result.text))
  } catch (err) {
    return aiErrorResponse(err, 'Failed to parse resume with AI. Please try again.')
  }

  // Format score (no job needed — just format quality)
  const fakeEmptyJob = {
    title: '', company: '', required_skills: [], preferred_skills: [],
    required_experience_years: 0, education_requirement: 'none', keywords: [],
    responsibilities: [], ats_system: '', red_flags: [], company_values: [],
    compensation: { min: null, max: null, currency: 'USD', period: 'annual' },
    work_type: 'remote', seniority: 'mid', summary: '',
  }
  const atsFormatScore = calculateATSScore(structuredData, fakeEmptyJob).breakdown.format

  // Insert to DB
  const { data: resumeRow, error: dbErr } = await supabase
    .from('resumes')
    .insert({
      user_id: user.id,
      title,
      original_file_url: fileUrl,
      original_file_type: fileType,
      raw_text: rawText.slice(0, 50000),
      structured_data: structuredData,
      ats_format_score: atsFormatScore,
    })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: 'Failed to save resume' }, { status: 500 })

  // Seed master profile from parsed resume (profile is source of truth).
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, profile_data')
    .eq('id', user.id)
    .single<Pick<Profile, 'first_name' | 'last_name' | 'email' | 'profile_data'>>()

  const seed = buildProfileSeedFromParse(structuredData, profileRow)
  await supabase
    .from('profiles')
    .update(profileRowUpdatesFromSeed(seed, profileRow))
    .eq('id', user.id)

  return NextResponse.json({ resumeId: resumeRow.id, structuredData, atsFormatScore, profileSeeded: true })
}
