export type ScoutLead = {
  id: string
  source: 'ats-search' | 'indeed' | 'linkedin' | 'manual' | 'other'
  source_url: string
  apply_url: string | null
  title: string
  company: string | null
  location: string | null
  remote: boolean | null
  fit_score: number | null
  fit_reasons: string[]
  deal_breakers: string[]
  status: 'new' | 'liked' | 'skipped' | 'later'
  liveness: 'live' | 'closed' | 'blocked' | 'unknown'
  liveness_reason: string | null
  apply_vendor: string | null
  apply_verdict: string | null
  apply_notes: string[]
  safety_blocked: boolean
  checked_at: string | null
  job_id: string | null
  created_at: string
}

export const SOURCE_LABEL: Record<ScoutLead['source'], string> = {
  'ats-search': 'Company site',
  indeed: 'Indeed',
  linkedin: 'LinkedIn',
  manual: 'Pasted link',
  other: 'Other',
}

export const VERDICT_COPY: Record<string, { label: string; tone: 'good' | 'warn' | 'neutral' }> = {
  ready: { label: 'Form ready to fill', tone: 'good' },
  'needs-explore': { label: 'Agent will click through', tone: 'neutral' },
  'login-needed': { label: 'Needs an account', tone: 'warn' },
  captcha: { label: 'Captcha: needs you', tone: 'warn' },
  aggregator: { label: 'Job board: find employer page', tone: 'neutral' },
  'no-form': { label: 'No form found', tone: 'warn' },
}
