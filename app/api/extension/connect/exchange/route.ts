import { NextResponse } from 'next/server'
import { exchangeConnectCode } from '@/lib/extension/connect'

export const runtime = 'nodejs'

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    origin && (origin.startsWith('chrome-extension://') || origin === 'http://localhost:3000')
      ? origin
      : '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

/**
 * Exchange a one-time connect code for session tokens (called by the extension).
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const code = typeof body.code === 'string' ? body.code : ''
  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400, headers })
  }

  try {
    const session = await exchangeConnectCode(code)
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired connect code — open Connect again from the extension' },
        { status: 401, headers },
      )
    }

    // Decode JWT exp if present; default 1h
    let expiresAt = Math.floor(Date.now() / 1000) + 3600
    try {
      const payload = JSON.parse(
        Buffer.from(session.accessToken.split('.')[1] || '', 'base64url').toString('utf8'),
      ) as { exp?: number }
      if (payload.exp) expiresAt = payload.exp
    } catch {
      /* keep default */
    }

    return NextResponse.json(
      {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt,
        email: session.email,
      },
      { status: 200, headers },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Exchange failed'
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500
    return NextResponse.json({ error: message }, { status, headers })
  }
}
