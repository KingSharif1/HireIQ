import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTokenUserId } from '@/lib/extension/tokens'
import {
  parseBoardInput,
  fetchBoardPostings,
  dedupePostings,
  type DiscoveredPosting,
} from '@/lib/jobs/board-discovery'
import { buildExtractedData } from '@/lib/jobs/save-from-url'
import { classifyApplyEase } from '@/lib/apply/ease'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_PER_BOARD = 25
const MAX_PER_BOARD = 100
const MAX_BOARDS = 10
const MAX_DESCRIPTION = 50_000

/**
 * POST /api/jobs/discover — pull live postings from employer ATS boards.
 *
 * Body: { boards: string[], dryRun?: boolean, limitPerBoard?: number }
 *   boards: "https://job-boards.greenhouse.io/acme", "jobs.lever.co/beta",
 *           "https://jobs.ashbyhq.com/gamma", or "greenhouse:acme"
 *
 * Auth: session OR `Authorization: Bearer <api_token>`.
 * Idempotent: postings whose apply_url already exists for the user are skipped.
 */
export async function POST(request: Request) {
  // --- auth -------------------------------------------------------------
  let userId: string | null = null
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) userId = user.id

  if (!userId) {
    const auth = request.headers.get('authorization') ?? ''
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
    if (bearer) userId = await resolveTokenUserId(bearer)
  }
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // --- body -------------------------------------------------------------
  let boards: string[] = []
  let dryRun = false
  let limitPerBoard = DEFAULT_PER_BOARD
  try {
    const body = (await request.json()) as {
      boards?: unknown
      dryRun?: unknown
      limitPerBoard?: unknown
    }
    if (Array.isArray(body.boards)) {
      boards = body.boards.filter((b): b is string => typeof b === 'string').slice(0, MAX_BOARDS)
    }
    dryRun = body.dryRun === true
    if (typeof body.limitPerBoard === 'number' && Number.isFinite(body.limitPerBoard)) {
      limitPerBoard = body.limitPerBoard
    }
  } catch {
    /* handled below */
  }

  limitPerBoard = Math.max(1, Math.min(Math.floor(limitPerBoard), MAX_PER_BOARD))

  if (boards.length === 0) {
    return NextResponse.json(
      { error: 'Provide at least one board (e.g. "greenhouse:acme")' },
      { status: 400 },
    )
  }

  const endpoints = boards.map(parseBoardInput)
  const invalid = boards.filter((_, i) => !endpoints[i])
  const valid = endpoints.filter((e): e is NonNullable<typeof e> => Boolean(e))

  if (valid.length === 0) {
    return NextResponse.json(
      { error: 'No supported board URLs', invalid, supported: ['greenhouse', 'lever', 'ashby'] },
      { status: 400 },
    )
  }

  // --- fetch ------------------------------------------------------------
  const fetched: DiscoveredPosting[] = []
  const boardResults: Array<{ board: string; provider: string; token: string; found: number; error?: string }> = []

  await Promise.all(
    valid.map(async (endpoint) => {
      try {
        const postings = await fetchBoardPostings(endpoint)
        fetched.push(...postings)
        boardResults.push({
          board: `${endpoint.provider}:${endpoint.token}`,
          provider: endpoint.provider,
          token: endpoint.token,
          found: postings.length,
        })
      } catch (err) {
        boardResults.push({
          board: `${endpoint.provider}:${endpoint.token}`,
          provider: endpoint.provider,
          token: endpoint.token,
          found: 0,
          error: err instanceof Error ? err.message : 'fetch failed',
        })
      }
    }),
  )

  const unique = dedupePostings(fetched)

  // --- skip already-saved ------------------------------------------------
  const admin = createAdminClient()
  const urls = unique.map((p) => p.applyUrl)
  const existingUrls = new Set<string>()
  if (urls.length > 0) {
    const { data: existing } = await admin
      .from('jobs')
      .select('apply_url')
      .eq('user_id', userId)
      .in('apply_url', urls)
    for (const row of existing ?? []) {
      if (typeof row.apply_url === 'string') existingUrls.add(row.apply_url)
    }
  }

  const fresh = unique.filter((p) => !existingUrls.has(p.applyUrl)).slice(0, limitPerBoard * valid.length)

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      boards: boardResults,
      invalid,
      found: unique.length,
      alreadySaved: unique.length - fresh.length,
      wouldSave: fresh.length,
      postings: fresh.map((p) => ({
        title: p.title,
        company: p.company,
        location: p.location,
        remoteType: p.remoteType,
        applyUrl: p.applyUrl,
        provider: p.provider,
        postedAt: p.postedAt,
      })),
    })
  }

  // --- insert ------------------------------------------------------------
  const rows = fresh.map((posting) => {
    const description = posting.description.slice(0, MAX_DESCRIPTION)
    const applyEase = classifyApplyEase({ url: posting.applyUrl })
    return {
      user_id: userId,
      source: `board:${posting.provider}`,
      company: posting.company,
      title: posting.title,
      description,
      location: posting.location,
      apply_url: posting.applyUrl,
      extracted_data: buildExtractedData({
        title: posting.title,
        company: posting.company,
        description,
        atsSystem: posting.provider,
        applyUrl: posting.applyUrl,
        applyEase,
      }),
    }
  })

  let saved = 0
  if (rows.length > 0) {
    const { data: inserted, error } = await admin.from('jobs').insert(rows).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    saved = inserted?.length ?? 0
  }

  return NextResponse.json(
    {
      ok: true,
      dryRun: false,
      boards: boardResults,
      invalid,
      found: unique.length,
      alreadySaved: unique.length - fresh.length,
      saved,
    },
    { status: saved > 0 ? 201 : 200 },
  )
}
