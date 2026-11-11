import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseLinkedInConnectionsCsv, connectionKey } from '@/lib/referrals/csv'

/**
 * Import a LinkedIn "Connections.csv" export. Accepts raw CSV text (text/csv)
 * or JSON `{ csv }`. Idempotent on the (user_id, url) unique index.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let csvText: string
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as { csv?: string } | null
    csvText = typeof body?.csv === 'string' ? body.csv : ''
  } else {
    csvText = await request.text()
  }

  if (!csvText.trim()) return NextResponse.json({ error: 'No CSV provided' }, { status: 400 })

  const rows = parseLinkedInConnectionsCsv(csvText)
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No connection rows found' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('linkedin_connections')
    .select('url')
    .eq('user_id', user.id)
  const existingUrls = new Set(
    (existing ?? []).map((e) => e.url?.trim().toLowerCase()).filter(Boolean),
  )

  const seen = new Set<string>()
  const toInsert = rows.filter((r) => {
    if (r.url && existingUrls.has(r.url.toLowerCase())) return false
    const key = connectionKey(r)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (toInsert.length > 0) {
    const { error } = await supabase.from('linkedin_connections').insert(
      toInsert.map((r) => ({
        user_id: user.id,
        first_name: r.firstName,
        last_name: r.lastName,
        url: r.url || null,
        company: r.company,
        position: r.position,
        email: r.email || null,
        connected_on: r.connectedOn || null,
        source: 'csv',
      })),
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ parsed: rows.length, imported: toInsert.length })
}
