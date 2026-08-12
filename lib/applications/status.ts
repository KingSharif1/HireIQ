import type { SupabaseClient } from '@supabase/supabase-js'
import type { Application, ApplicationStatus } from '@/types'

export class ApplicationStatusError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'update_failed' | 'event_failed' = 'update_failed'
  ) {
    super(message)
    this.name = 'ApplicationStatusError'
  }
}

/**
 * Update application status, append a status_change event, and mirror onto jobs.application_status.
 * Prefer application_id; job_id resolves the 1:1 application row.
 */
export async function setApplicationStatus(
  db: SupabaseClient,
  params: {
    userId: string
    status: ApplicationStatus
    applicationId?: string
    jobId?: string
    meta?: Record<string, unknown>
  }
): Promise<Application> {
  const { userId, status, meta = {} } = params

  let query = db.from('applications').select('*').eq('user_id', userId)
  if (params.applicationId) {
    query = query.eq('id', params.applicationId)
  } else if (params.jobId) {
    query = query.eq('job_id', params.jobId)
  } else {
    throw new ApplicationStatusError('applicationId or jobId required', 'not_found')
  }

  const { data: current, error: loadError } = await query.maybeSingle<Application>()
  if (loadError || !current) {
    throw new ApplicationStatusError('Application not found', 'not_found')
  }

  if (current.status === status) {
    return current
  }

  const now = new Date().toISOString()
  const patch: Partial<Application> & { updated_at: string; applied_at?: string } = {
    status,
    updated_at: now,
  }
  if (status === 'applied' && !current.applied_at) {
    patch.applied_at = now
  }

  const { data: updated, error: updateError } = await db
    .from('applications')
    .update(patch)
    .eq('id', current.id)
    .eq('user_id', userId)
    .select('*')
    .single<Application>()

  if (updateError || !updated) {
    throw new ApplicationStatusError(updateError?.message ?? 'Failed to update status', 'update_failed')
  }

  const { error: eventError } = await db.from('application_events').insert({
    application_id: current.id,
    user_id: userId,
    event_type: 'status_change',
    from_status: current.status,
    to_status: status,
    meta,
  })

  if (eventError) {
    throw new ApplicationStatusError(eventError.message, 'event_failed')
  }

  // Mirror for Job Hub / legacy reads until jobs.application_status is dropped
  await db
    .from('jobs')
    .update({ application_status: status, updated_at: now })
    .eq('id', current.job_id)
    .eq('user_id', userId)

  return updated
}
