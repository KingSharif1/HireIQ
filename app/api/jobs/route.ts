import { NextResponse } from 'next/server'
import { resolveExtensionUserId } from '@/lib/extension/tokens'
import { saveJobFromUrl, UnsavableJobUrlError } from '@/lib/jobs/save-from-url'

export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    origin && (origin.startsWith('chrome-extension://') || origin === 'http://localhost:3000')
      ? origin
      : 'chrome-extension://*'
  return {
    'Access-Control-Allow-Origin': allow === 'chrome-extension://*' ? '*' : allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

/**
 * Token-authed job create for the Chrome extension.
 * Inserts a jobs row; DB trigger creates the tracker application.
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  const auth = request.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!bearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  }

  let userId: string | null
  try {
    userId = await resolveExtensionUserId(bearer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth failed'
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500
    return NextResponse.json({ error: message }, { status, headers })
  }

  if (!userId) {
    return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401, headers })
  }

  let body: {
    url?: string
    title?: string
    company?: string
    description?: string
    location?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : ''
  if (!rawUrl) {
    return NextResponse.json({ error: 'url is required' }, { status: 400, headers })
  }

  try {
    const saved = await saveJobFromUrl({
      userId,
      url: rawUrl,
      source: 'extension',
      title: body.title,
      company: body.company,
      description: body.description,
      location: body.location,
    })
    const base = APP_URL.replace(/\/$/, '')
    const trackerUrl = `${base}/dashboard/tracker/${saved.jobId}`
    return NextResponse.json(
      {
        jobId: saved.jobId,
        trackerUrl,
        resumeUrl: `${trackerUrl}?tab=documents`,
        coverUrl: `${trackerUrl}?tab=documents`,
        saved: {
          title: saved.title,
          company: saved.company,
          location: saved.location,
          applyUrl: saved.applyUrl,
          descriptionChars: saved.descriptionChars,
        },
        existing: saved.existing || undefined,
      },
      { status: saved.existing ? 200 : 201, headers },
    )
  } catch (err) {
    if (err instanceof UnsavableJobUrlError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers })
    }
    const message = err instanceof Error ? err.message : 'Failed to save job'
    return NextResponse.json({ error: message }, { status: 500, headers })
  }
}
