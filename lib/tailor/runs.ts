import type { SupabaseClient } from '@supabase/supabase-js'
import type { GapAnalysis, GapQuestion } from '@/types'
import type { TailorProcessLogEntry } from '@/lib/tailor/process-log'
import {
  isActiveTailorStatus,
  isStaleBusyRun,
  type TailorRunRow,
  type TailorRunStatus,
} from '@/lib/tailor/run-types'

function asRun(row: Record<string, unknown>): TailorRunRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    job_id: String(row.job_id),
    status: row.status as TailorRunStatus,
    process_log: Array.isArray(row.process_log) ? (row.process_log as TailorProcessLogEntry[]) : [],
    gap_analysis: (row.gap_analysis as GapAnalysis | null) ?? null,
    questions: Array.isArray(row.questions) ? (row.questions as GapQuestion[]) : [],
    answers: (row.answers as Record<string, string>) ?? {},
    tailored_resume_id: row.tailored_resume_id ? String(row.tailored_resume_id) : null,
    error: row.error ? String(row.error) : null,
    gap_reserved: Boolean(row.gap_reserved),
    generate_reserved: Boolean(row.generate_reserved),
    claude_calls: Number(row.claude_calls) || 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    finished_at: row.finished_at ? String(row.finished_at) : null,
  }
}

export async function getActiveTailorRun(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
): Promise<TailorRunRow | null> {
  const { data } = await supabase
    .from('tailor_runs')
    .select('*')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .in('status', ['analyzing_gaps', 'awaiting_answers', 'generating', 'needs_review'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? asRun(data as Record<string, unknown>) : null
}

export async function listActiveTailorRuns(
  supabase: SupabaseClient,
  userId: string,
): Promise<TailorRunRow[]> {
  const { data } = await supabase
    .from('tailor_runs')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['analyzing_gaps', 'awaiting_answers', 'generating', 'needs_review'])
    .order('updated_at', { ascending: false })
  return (data ?? []).map(row => asRun(row as Record<string, unknown>))
}

export async function getTailorRun(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
): Promise<TailorRunRow | null> {
  const { data } = await supabase
    .from('tailor_runs')
    .select('*')
    .eq('id', runId)
    .eq('user_id', userId)
    .maybeSingle()
  return data ? asRun(data as Record<string, unknown>) : null
}

export async function insertTailorRun(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  processLog: TailorProcessLogEntry[],
): Promise<{ run: TailorRunRow; created: boolean }> {
  const existing = await getActiveTailorRun(supabase, userId, jobId)
  if (existing && isActiveTailorStatus(existing.status)) {
    return { run: existing, created: false }
  }
  if (existing?.status === 'needs_review') {
    return { run: existing, created: false }
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('tailor_runs')
    .insert({
      user_id: userId,
      job_id: jobId,
      status: 'analyzing_gaps',
      process_log: processLog,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error) {
    const again = await getActiveTailorRun(supabase, userId, jobId)
    if (again) return { run: again, created: false }
    throw new Error(error.message)
  }
  return { run: asRun(data as Record<string, unknown>), created: true }
}

export async function loadTailoredSnapshot(
  supabase: SupabaseClient,
  tailoredId: string | null,
) {
  if (!tailoredId) return null
  const { data } = await supabase
    .from('tailored_resumes')
    .select(
      'id, version, structured_data, original_structured_data, changes, change_decisions, match_score, tailored_score',
    )
    .eq('id', tailoredId)
    .maybeSingle()
  return data
}

export async function patchTailorRun(
  supabase: SupabaseClient,
  runId: string,
  patch: Record<string, unknown>,
): Promise<TailorRunRow | null> {
  const { data } = await supabase
    .from('tailor_runs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', runId)
    .select('*')
    .maybeSingle()
  return data ? asRun(data as Record<string, unknown>) : null
}

/** One winner. If this returns null, another worker already reserved the Claude call. */
export async function claimGapPhase(
  supabase: SupabaseClient,
  runId: string,
): Promise<TailorRunRow | null> {
  const { data } = await supabase
    .from('tailor_runs')
    .update({ gap_reserved: true, updated_at: new Date().toISOString() })
    .eq('id', runId)
    .eq('gap_reserved', false)
    .eq('status', 'analyzing_gaps')
    .select('*')
    .maybeSingle()
  return data ? asRun(data as Record<string, unknown>) : null
}

/** One winner for the rewrite. Never retries after generate_reserved is true. */
export async function claimGeneratePhase(
  supabase: SupabaseClient,
  runId: string,
  answers: Record<string, string>,
): Promise<TailorRunRow | null> {
  const { data } = await supabase
    .from('tailor_runs')
    .update({
      generate_reserved: true,
      status: 'generating',
      answers,
      updated_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('generate_reserved', false)
    .in('status', ['analyzing_gaps', 'awaiting_answers', 'generating'])
    .select('*')
    .maybeSingle()
  return data ? asRun(data as Record<string, unknown>) : null
}

const STALE_FAIL_MESSAGE =
  'Stopped — the background tailor did not finish. We did not start another Claude call. You can try again.'

export async function failStaleBusyRun(
  supabase: SupabaseClient,
  run: TailorRunRow,
): Promise<TailorRunRow> {
  if (!isStaleBusyRun(run)) return run
  const failed = await patchTailorRun(supabase, run.id, {
    status: 'failed',
    error: STALE_FAIL_MESSAGE,
    finished_at: new Date().toISOString(),
  })
  return failed ?? run
}
