import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveExtensionUserId } from '@/lib/extension/tokens'
import { normalizeProfileData } from '@/lib/profile/provenance'
import {
  buildResumeContext,
  extractKnownSensitiveFacts,
} from '@/lib/extension/autofill-context'
import { isSensitiveFieldLabel } from '@/lib/extension/sensitive-fields'
import { isLastingCareerFact } from '@/lib/extension/draft-kind'
import { AUTOFILL_DRAFTS_PROMPT, extractJSON } from '@/lib/ai/prompts'
import { resolveAiRuntime } from '@/lib/ai/runtime'
import { generateAiText } from '@/lib/ai/complete'
import { withAiOnce, AiInFlightError } from '@/lib/ai/once'
import type { ProfileData } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FIELDS = 25

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

export type AutofillDraftField = {
  key: string
  label: string
  required?: boolean
  inputType?: string
}

export type AutofillDraft = {
  key: string
  answer: string
  lasting: boolean
  skip: boolean
  skipReason: string
}

function isFileInput(inputType?: string): boolean {
  const t = (inputType || '').toLowerCase()
  return t === 'file' || t === 'file_upload'
}

function applyServerSensitiveRules(
  draft: AutofillDraft,
  label: string,
  known: Record<string, string>,
): AutofillDraft {
  if (!isSensitiveFieldLabel(label)) return draft

  const knownValues = Object.values(known).filter(Boolean)
  if (knownValues.length === 0) {
    return {
      key: draft.key,
      answer: '',
      lasting: isLastingCareerFact(label),
      skip: true,
      skipReason: 'Sensitive field — no matching fact in profile',
    }
  }

  // Allow only if the drafted answer is grounded in a known fact string.
  const answer = (draft.answer || '').trim()
  const grounded = knownValues.some(
    v => answer.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(answer.toLowerCase()),
  )
  if (!answer || !grounded) {
    return {
      key: draft.key,
      answer: '',
      lasting: isLastingCareerFact(label),
      skip: true,
      skipReason: 'Sensitive field — answer not grounded in known profile facts',
    }
  }
  return { ...draft, skip: false, skipReason: '', lasting: isLastingCareerFact(label) }
}

function parseDrafts(text: string): AutofillDraft[] {
  const raw = JSON.parse(extractJSON(text)) as unknown
  const arr = Array.isArray(raw) ? raw : Array.isArray((raw as { drafts?: unknown })?.drafts)
    ? (raw as { drafts: unknown[] }).drafts
    : []
  return arr
    .map((item): AutofillDraft | null => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const key = typeof o.key === 'string' ? o.key : ''
      if (!key) return null
      return {
        key,
        answer: typeof o.answer === 'string' ? o.answer : '',
        lasting: Boolean(o.lasting),
        skip: Boolean(o.skip),
        skipReason: typeof o.skipReason === 'string' ? o.skipReason : '',
      }
    })
    .filter((d): d is AutofillDraft => d !== null)
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
    title?: string
    company?: string
    description?: string
    fields?: AutofillDraftField[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const fieldsIn = Array.isArray(body.fields) ? body.fields : []
  if (fieldsIn.length === 0) {
    return NextResponse.json({ error: 'fields array is required' }, { status: 400, headers })
  }
  if (fieldsIn.length > MAX_FIELDS) {
    return NextResponse.json(
      { error: `Max ${MAX_FIELDS} fields per request` },
      { status: 400, headers },
    )
  }

  const fields = fieldsIn
    .filter(f => f && typeof f.key === 'string' && typeof f.label === 'string')
    .map(f => ({
      key: f.key.trim(),
      label: f.label.trim(),
      required: Boolean(f.required),
      inputType: typeof f.inputType === 'string' ? f.inputType : 'text',
    }))
    .filter(f => f.key && f.label)

  const admin = createAdminClient()
  const { data: profileRow, error: profileError } = await admin
    .from('profiles')
    .select('profile_data, years_experience')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500, headers })
  }
  if (!profileRow) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers })
  }

  let title = (body.title || '').trim()
  let company = (body.company || '').trim()
  let description = (body.description || '').trim()

  if (body.jobId) {
    const { data: job } = await admin
      .from('jobs')
      .select('title, company, description')
      .eq('id', body.jobId)
      .eq('user_id', userId)
      .maybeSingle()
    if (job) {
      if (!title) title = job.title || ''
      if (!company) company = job.company || ''
      if (!description) description = job.description || ''
    }
  }

  const profileData = normalizeProfileData(
    ((profileRow.profile_data ?? {}) as ProfileData),
  )
  const resumeContext = buildResumeContext(profileData)
  const knownFacts = extractKnownSensitiveFacts(
    profileData,
    profileRow.years_experience as number | null,
  )
  const knownRecord = Object.fromEntries(
    Object.entries(knownFacts).filter(([, v]) => Boolean(v)),
  ) as Record<string, string>

  // Pre-skip file fields server-side so the model sees fewer items.
  const preDrafts: AutofillDraft[] = []
  const aiFields: AutofillDraftField[] = []
  for (const f of fields) {
    if (isFileInput(f.inputType)) {
      preDrafts.push({
        key: f.key,
        answer: '',
        lasting: false,
        skip: true,
        skipReason: 'file field',
      })
      continue
    }
    if (isSensitiveFieldLabel(f.label) && Object.keys(knownRecord).length === 0) {
      preDrafts.push({
        key: f.key,
        answer: '',
        lasting: isLastingCareerFact(f.label),
        skip: true,
        skipReason: 'Sensitive field — no matching fact in profile',
      })
      continue
    }
    aiFields.push(f)
  }

  let aiDrafts: AutofillDraft[] = []
  if (aiFields.length > 0) {
    const prompt = AUTOFILL_DRAFTS_PROMPT
      .replace('{resumeContext}', resumeContext || '(empty profile)')
      .replace(
        '{knownSensitiveFacts}',
        Object.keys(knownRecord).length > 0
          ? JSON.stringify(knownRecord, null, 2)
          : '(none stored)',
      )
      .replace('{jobTitle}', title || '(unknown)')
      .replace('{jobCompany}', company || '(unknown)')
      .replace('{jobDescription}', (description || '').slice(0, 2500) || '(none)')
      .replace('{fieldsJson}', JSON.stringify(aiFields))

    try {
      const ai = await resolveAiRuntime(userId)
      const result = await withAiOnce(`autofill:${userId}:${body.jobId || 'none'}`, () =>
        generateAiText({
          runtime: ai,
          feature: 'autofill_draft',
          tier: 'fast',
          prompt,
          maxOutputTokens: 2500,
        }),
      )
      aiDrafts = parseDrafts(result.text)
    } catch (err) {
      if (err instanceof AiInFlightError) {
        return NextResponse.json({ error: err.message }, { status: 429, headers })
      }
      const message = err instanceof Error ? err.message : 'AI draft failed'
      return NextResponse.json({ error: message }, { status: 502, headers })
    }
  }

  const byKey = new Map(aiDrafts.map(d => [d.key, d]))
  const labelByKey = new Map(fields.map(f => [f.key, f.label]))

  const drafts: AutofillDraft[] = [
    ...preDrafts,
    ...aiFields.map(f => {
      const raw = byKey.get(f.key) || {
        key: f.key,
        answer: '',
        lasting: isLastingCareerFact(f.label),
        skip: true,
        skipReason: 'No draft returned',
      }
      const withLasting: AutofillDraft = {
        ...raw,
        lasting: isLastingCareerFact(f.label),
      }
      return applyServerSensitiveRules(withLasting, f.label, knownRecord)
    }),
  ]

  // Preserve request order for non-pre-skipped fields; pre-skipped file/sensitive keep their keys.
  const order = fields.map(f => f.key)
  const draftMap = new Map(drafts.map(d => [d.key, d]))
  const ordered = order
    .map(k => draftMap.get(k))
    .filter((d): d is AutofillDraft => Boolean(d))
    .map(d => {
      const label = labelByKey.get(d.key) || ''
      if (d.skip) return d
      // Empty answer → skip
      if (!(d.answer || '').trim()) {
        return { ...d, skip: true, skipReason: d.skipReason || 'Empty answer', answer: '' }
      }
      return { ...d, lasting: isLastingCareerFact(label) }
    })

  return NextResponse.json({ drafts: ordered }, { status: 200, headers })
}
