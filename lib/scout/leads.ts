import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeApplyUrl } from '@/lib/extension/normalize-url'
import { saveJobFromUrl, UnsavableJobUrlError } from '@/lib/jobs/save-from-url'
import { evaluateDealBreakers, DEFAULT_SCOUT_PREFS, type ScoutPrefs } from '@/lib/scout/deal-breakers'
import { scanPostingSafety } from '@/lib/scout/safety'
import { classifyLiveness, fetchPage, isSafeFetchTarget } from '@/lib/scout/liveness'
import { mapApplyPage } from '@/lib/scout/apply-map'

export type LeadInput = {
  url: string
  title: string
  company?: string | null
  location?: string | null
  remote?: boolean | null
  description?: string | null
  applyUrl?: string | null
  source?: 'ats-search' | 'indeed' | 'linkedin' | 'manual' | 'other'
  /** Optional fit score (0-100) and reasons computed by the scout. */
  fitScore?: number | null
  fitReasons?: string[]
}

export type IngestResult = { added: number; duplicates: number; autoSkipped: number; rejected: number }

const MAX_LEADS_PER_CALL = 50

function clip(s: string | null | undefined, n: number): string | null {
  const t = (s ?? '').trim()
  return t ? t.slice(0, n) : null
}

export async function ingestLeads(
  userId: string,
  leads: LeadInput[],
  prefs: ScoutPrefs = DEFAULT_SCOUT_PREFS,
): Promise<IngestResult> {
  const admin = createAdminClient()
  const result: IngestResult = { added: 0, duplicates: 0, autoSkipped: 0, rejected: 0 }

  for (const lead of leads.slice(0, MAX_LEADS_PER_CALL)) {
    const title = clip(lead.title, 500)
    if (!title || !isSafeFetchTarget(lead.url)) {
      result.rejected++
      continue
    }
    const sourceUrl = lead.url.trim()
    const urlKey = normalizeApplyUrl(sourceUrl)
    const dealBreakers = evaluateDealBreakers(
      { title, location: lead.location, remote: lead.remote, description: lead.description },
      prefs,
    )
    const descSafety = lead.description ? scanPostingSafety({ text: lead.description }) : null
    const fit = typeof lead.fitScore === 'number' ? Math.max(0, Math.min(100, Math.round(lead.fitScore))) : null

    const { error, data } = await admin
      .from('job_leads')
      .upsert(
        {
          user_id: userId,
          source: lead.source ?? 'other',
          source_url: sourceUrl,
          url_key: urlKey,
          apply_url: lead.applyUrl && isSafeFetchTarget(lead.applyUrl) ? lead.applyUrl.trim() : null,
          title,
          company: clip(lead.company, 500),
          location: clip(lead.location, 500),
          remote: lead.remote ?? null,
          description: descSafety && !descSafety.safe ? null : clip(lead.description, 50_000),
          fit_score: fit,
          fit_reasons: (lead.fitReasons ?? []).slice(0, 8),
          deal_breakers: dealBreakers.reasons,
          status: dealBreakers.blocked ? 'skipped' : 'new',
          safety: descSafety?.findings ?? [],
          safety_blocked: descSafety ? !descSafety.safe : false,
        },
        { onConflict: 'user_id,url_key', ignoreDuplicates: true },
      )
      .select('id')

    if (error) {
      result.rejected++
    } else if (!data || data.length === 0) {
      result.duplicates++
    } else if (dealBreakers.blocked) {
      result.autoSkipped++
    } else {
      result.added++
    }
  }
  return result
}

export type LeadCheckSummary = {
  liveness: string
  livenessReason: string
  applyVendor: string | null
  applyVerdict: string | null
  safetyBlocked: boolean
}

/**
 * Open the employer page, confirm it is live, scan it for tricks, and map the
 * apply form. Indeed and LinkedIn pages are not fetched (they block bots and
 * forbid it); those leads need the employer link found another way.
 */
export async function checkLead(userId: string, leadId: string): Promise<LeadCheckSummary | null> {
  const admin = createAdminClient()
  const { data: lead } = await admin
    .from('job_leads')
    .select('id, source, source_url, apply_url')
    .eq('id', leadId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!lead) return null

  const target = lead.apply_url || lead.source_url
  const aggregator = /(^|\.)((indeed|linkedin|glassdoor|ziprecruiter)\.com)$/i.test(new URL(target).hostname)

  let patch: Record<string, unknown>
  if (aggregator) {
    patch = {
      liveness: 'unknown',
      liveness_reason: 'job-board page: find the employer page to check it',
      apply_vendor: lead.source === 'linkedin' ? 'linkedin' : 'indeed',
      apply_verdict: 'aggregator',
      apply_notes: ['open the employer career page to check and apply'],
    }
  } else {
    const page = await fetchPage(target)
    if (!page) {
      patch = { liveness: 'unknown', liveness_reason: 'could not reach the page', apply_verdict: null }
    } else {
      const safety = scanPostingSafety({ text: page.text, html: page.html })
      const live = classifyLiveness({ status: page.status, originalUrl: target, finalUrl: page.finalUrl, text: page.text })
      const map = mapApplyPage({ url: page.finalUrl, html: page.html })
      patch = {
        liveness: live.state,
        liveness_reason: live.reason,
        apply_vendor: map.vendor,
        apply_verdict: map.verdict,
        apply_notes: map.notes,
        apply_url: map.applyLink && map.verdict === 'needs-explore' ? map.applyLink : lead.apply_url,
        safety: safety.findings,
        safety_blocked: !safety.safe,
      }
    }
  }

  await admin
    .from('job_leads')
    .update({ ...patch, checked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('user_id', userId)

  return {
    liveness: String(patch.liveness),
    livenessReason: String(patch.liveness_reason ?? ''),
    applyVendor: (patch.apply_vendor as string | null) ?? null,
    applyVerdict: (patch.apply_verdict as string | null) ?? null,
    safetyBlocked: Boolean(patch.safety_blocked),
  }
}

export type DecisionResult =
  | { ok: true; status: 'liked' | 'skipped' | 'later'; jobId?: string }
  | { ok: false; code: 'not_found' | 'closed' | 'unsafe' | 'unsavable'; message: string }

export async function decideLead(
  userId: string,
  leadId: string,
  decision: 'like' | 'skip' | 'later',
): Promise<DecisionResult> {
  const admin = createAdminClient()
  const { data: lead } = await admin
    .from('job_leads')
    .select('*')
    .eq('id', leadId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!lead) return { ok: false, code: 'not_found', message: 'Lead not found' }

  const now = new Date().toISOString()
  if (decision !== 'like') {
    const status = decision === 'skip' ? 'skipped' : 'later'
    await admin.from('job_leads').update({ status, decided_at: now, updated_at: now }).eq('id', leadId).eq('user_id', userId)
    return { ok: true, status }
  }

  if (lead.liveness === 'closed') {
    return { ok: false, code: 'closed', message: 'This posting looks closed' }
  }
  if (lead.safety_blocked) {
    return { ok: false, code: 'unsafe', message: 'This posting contains hidden instructions, so it was not sent to the agent' }
  }

  try {
    const saved = await saveJobFromUrl({
      userId,
      url: lead.apply_url || lead.source_url,
      source: 'scout',
      title: lead.title,
      company: lead.company ?? undefined,
      location: lead.location ?? undefined,
      description: lead.description ?? undefined,
    })
    await admin
      .from('job_leads')
      .update({ status: 'liked', job_id: saved.jobId, decided_at: now, updated_at: now })
      .eq('id', leadId)
      .eq('user_id', userId)
    return { ok: true, status: 'liked', jobId: saved.jobId }
  } catch (err) {
    if (err instanceof UnsavableJobUrlError) {
      return { ok: false, code: 'unsavable', message: err.message }
    }
    throw err
  }
}
