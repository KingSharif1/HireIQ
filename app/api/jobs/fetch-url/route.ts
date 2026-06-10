import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeJobUrl } from '@/lib/jobs/job-scraper'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  try {
    const result = await scrapeJobUrl(url)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch job' },
      { status: 422 }
    )
  }
}
