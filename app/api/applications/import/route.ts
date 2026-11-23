import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setApplicationStatus } from '@/lib/applications/status'
import { ledgerSchema, planLedgerImport } from '@/lib/applications/ledger-import'

/**
 * Import a job-hunt ledger (issue #30) into the signed-in user's tracker.
 * Idempotent per apply URL: re-importing updates status/notes instead of
 * duplicating jobs. Runs with the user's session (RLS), never the service role.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = ledgerSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ledger format not recognized', details: parsed.error.flatten() }, { status: 400 })
  }

  const results: Array<{ company: string; title: string; outcome: 'created' | 'updated' | 'failed'; error?: string }> = []

  for (const row of planLedgerImport(parsed.data.applications)) {
    try {
      const { data: existing } = await supabase
        .from('jobs')
        .select('id')
        .eq('user_id', user.id)
        .eq('apply_url', row.url)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let jobId = existing?.id as string | undefined
      if (!jobId) {
        const { data: job, error } = await supabase
          .from('jobs')
          .insert({
            user_id: user.id,
            source: 'import',
            company: row.company,
            title: row.title,
            location: row.location,
            description: `Imported from job-hunt ledger — ${row.url}`,
            apply_url: row.url,
          })
          .select('id')
          .single()
        if (error || !job) throw new Error(error?.message || 'Failed to create job')
        jobId = job.id as string
      }

      const app = await setApplicationStatus(supabase, {
        userId: user.id,
        jobId,
        status: row.status,
        meta: { via: 'ledger_import' },
      })

      const patch: Record<string, string> = {}
      if (row.appliedAt) patch.applied_at = row.appliedAt
      if (row.notes && !(app.notes ?? '').includes(row.notes)) {
        patch.notes = app.notes ? `${app.notes}\n\n${row.notes}` : row.notes
      }
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from('applications').update(patch).eq('id', app.id).eq('user_id', user.id)
        if (error) throw new Error(error.message)
      }

      results.push({ company: row.company, title: row.title, outcome: existing ? 'updated' : 'created' })
    } catch (err) {
      results.push({
        company: row.company,
        title: row.title,
        outcome: 'failed',
        error: err instanceof Error ? err.message : 'Import failed',
      })
    }
  }

  const failed = results.filter((r) => r.outcome === 'failed').length
  return NextResponse.json(
    {
      created: results.filter((r) => r.outcome === 'created').length,
      updated: results.filter((r) => r.outcome === 'updated').length,
      failed,
      results,
    },
    { status: failed === results.length ? 500 : 200 },
  )
}
