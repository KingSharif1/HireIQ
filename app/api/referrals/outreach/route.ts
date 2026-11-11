import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  checkOutreachTransition,
  defaultOutreachStage,
  stageTimestamps,
  summariseOutreach,
  type OutreachRow,
} from '@/lib/referrals/outreach'
import { REFERRAL_STAGES } from '@/lib/referrals/stages'
import type { ReferralStage } from '@/types'

export const dynamic = 'force-dynamic'

const SELECT =
  'id, connection_id, job_id, application_id, stage, message_draft, referral_strength, asked_at, replied_at, created_at, updated_at'

function isStage(value: unknown): value is ReferralStage {
  return typeof value === 'string' && (REFERRAL_STAGES as readonly string[]).includes(value)
}

/**
 * GET /api/referrals/outreach?connectionId=&applicationId=
 * The referral funnel for a connection or application (plus its summary).
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const connectionId = url.searchParams.get('connectionId')
  const applicationId = url.searchParams.get('applicationId')

  let query = supabase
    .from('referral_outreach')
    .select(SELECT)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(200)
  if (connectionId) query = query.eq('connection_id', connectionId)
  if (applicationId) query = query.eq('application_id', applicationId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as OutreachRow[]
  return NextResponse.json({ outreach: rows, summary: summariseOutreach(rows) })
}

/**
 * POST /api/referrals/outreach
 * Body: { connectionId, applicationId?, jobId?, stage?, messageDraft?, referralStrength? }
 * Messages are drafts — nothing is ever sent by HireIQ.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const connectionId = typeof body.connectionId === 'string' ? body.connectionId : ''
  if (!connectionId) {
    return NextResponse.json({ error: 'connectionId is required' }, { status: 400 })
  }

  const stage = isStage(body.stage) ? body.stage : defaultOutreachStage()
  const timestamps = stageTimestamps(stage)

  const insert = {
    user_id: user.id,
    connection_id: connectionId,
    application_id: typeof body.applicationId === 'string' ? body.applicationId : null,
    job_id: typeof body.jobId === 'string' ? body.jobId : null,
    stage,
    message_draft: typeof body.messageDraft === 'string' ? body.messageDraft : null,
    referral_strength:
      typeof body.referralStrength === 'number' && Number.isFinite(body.referralStrength)
        ? body.referralStrength
        : null,
    ...timestamps,
  }

  const { data, error } = await supabase.from('referral_outreach').insert(insert).select(SELECT).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ outreach: data as OutreachRow }, { status: 201 })
}

/**
 * PATCH /api/referrals/outreach
 * Body: { id, stage } — moves one ask along the funnel, enforcing transitions.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id : ''
  const to = wholeStage(body.stage)
  if (!id || !to) {
    return NextResponse.json({ error: 'id and a valid stage are required' }, { status: 400 })
  }

  const { data: current, error: loadError } = await supabase
    .from('referral_outreach')
    .select('id, stage')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 })
  if (!current) return NextResponse.json({ error: 'Outreach not found' }, { status: 404 })

  const check = checkOutreachTransition(current.stage as ReferralStage, to)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 409 })

  const { data, error } = await supabase
    .from('referral_outreach')
    .update({ stage: to, updated_at: new Date().toISOString(), ...stageTimestamps(to) })
    .eq('id', id)
    .eq('user_id', user.id)
    .select(SELECT)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ outreach: data as OutreachRow })
}

function wholeStage(value: unknown): ReferralStage | null {
  return isStage(value) ? value : null
}
