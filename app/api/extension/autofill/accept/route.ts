import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveExtensionUserId } from '@/lib/extension/tokens'
import { isLastingCareerFact } from '@/lib/extension/draft-kind'
import { mergePendingSuggestions, normalizeProfileData } from '@/lib/profile/provenance'
import { uid } from '@/lib/profile/data'
import type { ApplicationFormAnswer, PendingSuggestion, PendingSuggestionSection, ProfileData } from '@/types'

export const runtime = 'nodejs'

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    origin && (origin.startsWith('chrome-extension://') || origin === 'http://localhost:3000')
      ? origin
      : '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

function suggestionSectionForLabel(label: string): PendingSuggestionSection {
  if (/\bskills?\b|tools?|languages?|technolog|framework|stack/i.test(label)) return 'skills'
  return 'summary'
}

function upsertFormAnswer(
  existing: ApplicationFormAnswer[],
  entry: ApplicationFormAnswer,
): ApplicationFormAnswer[] {
  const idx = existing.findIndex(a => a.key === entry.key)
  if (idx === -1) return [...existing, entry]
  const next = [...existing]
  next[idx] = entry
  return next
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  const auth = request.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!bearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  }

  let userId: string | null
  try {
    userId = await resolveExtensionUserId(bearer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth failed'
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500
    return NextResponse.json({ error: message }, { status, headers })
  }
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401, headers })
  }

  let body: {
    jobId?: string
    key?: string
    question?: string
    answer?: string
    promoteToMaster?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : ''
  const key = typeof body.key === 'string' ? body.key.trim() : ''
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const answer = typeof body.answer === 'string' ? body.answer.trim() : ''
  if (!jobId || !key || !question) {
    return NextResponse.json(
      { error: 'jobId, key, and question are required' },
      { status: 400, headers },
    )
  }

  const admin = createAdminClient()

  const { data: job, error: jobError } = await admin
    .from('jobs')
    .select('id, title, company')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle()

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500, headers })
  }
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404, headers })
  }

  const { data: app, error: appError } = await admin
    .from('applications')
    .select('id, form_answers')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .maybeSingle()

  if (appError) {
    return NextResponse.json({ error: appError.message }, { status: 500, headers })
  }
  if (!app) {
    return NextResponse.json({ error: 'Application not found for this job' }, { status: 404, headers })
  }

  const existing = Array.isArray(app.form_answers)
    ? (app.form_answers as ApplicationFormAnswer[])
    : []
  const entry: ApplicationFormAnswer = {
    key,
    question,
    answer,
    updatedAt: new Date().toISOString(),
  }
  const form_answers = upsertFormAnswer(existing, entry)

  const { error: updateError } = await admin
    .from('applications')
    .update({ form_answers, updated_at: new Date().toISOString() })
    .eq('id', app.id)
    .eq('user_id', userId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500, headers })
  }

  const lasting = isLastingCareerFact(question)
  let pendingSuggestionId: string | undefined

  if (body.promoteToMaster && lasting && answer) {
    const { data: profileRow, error: profileError } = await admin
      .from('profiles')
      .select('profile_data')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500, headers })
    }

    const profileData = normalizeProfileData(
      ((profileRow?.profile_data ?? {}) as ProfileData),
    )
    const suggestion: PendingSuggestion = {
      id: uid('psug'),
      section: suggestionSectionForLabel(question),
      proposedText: answer,
      reason: `Accepted from application form: ${question}`,
      sourceTailoredResumeId: `ext:${jobId}`,
      jobLabel: `${job.title || 'Role'} @ ${job.company || 'Company'}`,
      createdAt: new Date().toISOString(),
      source: 'tailor',
    }
    const merged = mergePendingSuggestions(profileData.pendingSuggestions ?? [], [suggestion])
    const nextData: ProfileData = { ...profileData, pendingSuggestions: merged }

    const { error: saveError } = await admin
      .from('profiles')
      .update({ profile_data: nextData, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500, headers })
    }
    pendingSuggestionId = suggestion.id
  }

  return NextResponse.json(
    { ok: true, lasting, ...(pendingSuggestionId ? { pendingSuggestionId } : {}) },
    { status: 200, headers },
  )
}
