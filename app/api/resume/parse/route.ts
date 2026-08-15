import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RESUME_PARSER_PROMPT, RESUME_VISION_PARSER_PROMPT } from '@/lib/ai/prompts'
import { aiErrorResponse } from '@/lib/ai/error-response'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { streamAiMessagesToCompletion, streamAiTextToCompletion } from '@/lib/ai/complete'
import { withAiOnce } from '@/lib/ai/once'
import { ndjsonResponse } from '@/lib/ai/ndjson-stream'
import { calculateATSScore } from '@/lib/scoring/ats-scorer'
import { buildProfileSeedFromParse, hasProfileContent, profileRowUpdatesFromSeed } from '@/lib/profile/master'
import { resolveProfileData } from '@/lib/profile/data'
import { hasParseAdditions, parseAdditions } from '@/lib/profile/parse-additions'
import { markdownToStructuredResume, streamingResumeProgress } from '@/lib/resume/markdown'
import { polishStructuredForExport } from '@/lib/export/format'
import {
  extractResumeTextLayer,
  MAX_RESUME_UPLOAD_BYTES,
  MAX_RESUME_UPLOAD_LABEL,
  needsVisionOcr,
} from '@/lib/resume/extract-text'
import type { StructuredResume, Profile } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 90

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
  extractSource: 'pdf-text' | 'docx-text' | 'pdf-vision'
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const title = (formData.get('title') as string) || 'My Resume'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_RESUME_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is too large. Max ${MAX_RESUME_UPLOAD_LABEL}.` },
      { status: 413 }
    )
  }

  const fileType = file.name.endsWith('.docx') ? 'docx' : 'pdf'
  const buffer = Buffer.from(await file.arrayBuffer())

  let extracted
  try {
    extracted = await extractResumeTextLayer(buffer, fileType)
  } catch {
    extracted = { text: '', source: fileType === 'docx' ? 'docx-text' as const : 'pdf-text' as const }
  }

  const useVision = needsVisionOcr(extracted.text, fileType)

  if (!useVision && extracted.text.replace(/\s+/g, ' ').trim().length < 50) {
    return NextResponse.json(
      {
        error:
          'Could not read enough text from that file. Try a text PDF/DOCX, or a clearer scan (PDF under 10MB).',
      },
      { status: 422 }
    )
  }

  if (useVision && fileType !== 'pdf') {
    return NextResponse.json(
      {
        error:
          'Could not read text from that DOCX. Export as PDF and try again (scans work via vision OCR).',
      },
      { status: 422 }
    )
  }

  const fileExt = fileType === 'pdf' ? 'pdf' : 'docx'
  const storageKey = `${user.id}/${Date.now()}.${fileExt}`
  const { data: storageData, error: storageErr } = await supabase.storage
    .from('resumes')
    .upload(storageKey, buffer, {
      contentType:
        fileType === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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

  const extractSource = useVision ? ('pdf-vision' as const) : extracted.source

  return ndjsonResponse<ParseDone>(async emit => {
    emit({
      type: 'progress',
      detail: useVision ? 'Reading scanned pages (OCR)' : 'Reading your resume',
    })

    const structuredData = await withAiOnce(`resume_parse:${user.id}`, async () => {
      let mdText: string
      if (useVision) {
        const result = await streamAiMessagesToCompletion({
          runtime: ai,
          feature: 'resume_parse',
          tier: 'strong',
          maxOutputTokens: 6000,
          partialEveryMs: 800,
          onPartial: text => {
            emit({ type: 'progress', detail: streamingResumeProgress(text) })
          },
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'file',
                  data: buffer,
                  mediaType: 'application/pdf',
                },
                { type: 'text', text: RESUME_VISION_PARSER_PROMPT },
              ],
            },
          ],
        })
        mdText = result.text
      } else {
        const prompt = RESUME_PARSER_PROMPT.replace(
          '{resumeText}',
          extracted.text.slice(0, 20000)
        )
        const result = await streamAiTextToCompletion({
          runtime: ai,
          feature: 'resume_parse',
          tier: 'strong',
          prompt,
          maxOutputTokens: 6000,
          partialEveryMs: 800,
          onPartial: text => {
            emit({ type: 'progress', detail: streamingResumeProgress(text) })
          },
        })
        mdText = result.text
      }

      const parsed = polishStructuredForExport(markdownToStructuredResume(mdText))
      if (!parsed.contact.name && !parsed.summary && parsed.experience.length === 0) {
        throw new Error(
          useVision
            ? 'Could not read that scan clearly. Try a sharper photo or a text PDF.'
            : 'Could not understand that resume. Try another file.'
        )
      }
      return parsed
    })

    emit({ type: 'progress', detail: 'Saving to your library' })

    const fakeEmptyJob = {
      title: '',
      company: '',
      required_skills: [],
      preferred_skills: [],
      required_experience_years: 0,
      education_requirement: 'none',
      keywords: [],
      responsibilities: [],
      ats_system: '',
      red_flags: [],
      company_values: [],
      compensation: { min: null, max: null, currency: 'USD', period: 'annual' },
      work_type: 'remote',
      seniority: 'mid',
      summary: '',
    }
    const atsFormatScore = calculateATSScore(structuredData, fakeEmptyJob).breakdown.format

    const { data: existingResumes } = await supabase
      .from('resumes')
      .select('id, is_primary')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    const existing = existingResumes?.[0]
    const rawTextForStore = useVision
      ? `[pdf-vision]\n${structuredData.summary || ''}`
      : extracted.text.slice(0, 50000)

    const payload = {
      title,
      original_file_url: fileUrl,
      original_file_type: fileType,
      raw_text: rawTextForStore,
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
      extractSource,
    })
  })
}
