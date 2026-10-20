import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveScoutUserId } from '@/lib/scout/auth'
import { ingestLeads, type LeadInput } from '@/lib/scout/leads'

export const runtime = 'nodejs'

const SOURCES = new Set(['ats-search', 'indeed', 'linkedin', 'manual', 'other'])

export async function GET(request: Request) {
  const userId = await resolveScoutUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = new URL(request.url).searchParams.get('status') || 'new'
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_leads')
    .select('id, source, source_url, apply_url, title, company, location, remote, fit_score, fit_reasons, deal_breakers, status, liveness, liveness_reason, apply_vendor, apply_verdict, apply_notes, safety_blocked, checked_at, job_id, created_at')
    .eq('user_id', userId)
    .eq('status', status)
    .order('fit_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data ?? [] })
}

export async function POST(request: Request) {
  const userId = await resolveScoutUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { leads?: unknown } | null
  if (!body || !Array.isArray(body.leads)) {
    return NextResponse.json({ error: 'Body must be { leads: [...] }' }, { status: 400 })
  }

  const leads: LeadInput[] = []
  for (const raw of body.leads.slice(0, 50)) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    if (typeof r.url !== 'string' || typeof r.title !== 'string') continue
    leads.push({
      url: r.url,
      title: r.title,
      company: typeof r.company === 'string' ? r.company : null,
      location: typeof r.location === 'string' ? r.location : null,
      remote: typeof r.remote === 'boolean' ? r.remote : null,
      description: typeof r.description === 'string' ? r.description : null,
      applyUrl: typeof r.applyUrl === 'string' ? r.applyUrl : null,
      source: typeof r.source === 'string' && SOURCES.has(r.source) ? (r.source as LeadInput['source']) : 'other',
      fitScore: typeof r.fitScore === 'number' ? r.fitScore : null,
      fitReasons: Array.isArray(r.fitReasons) ? r.fitReasons.filter((x): x is string => typeof x === 'string') : [],
    })
  }

  const result = await ingestLeads(userId, leads)
  return NextResponse.json(result, { status: 201 })
}
