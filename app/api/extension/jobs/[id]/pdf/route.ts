import { NextResponse } from 'next/server'
import React from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveExtensionUserId } from '@/lib/extension/tokens'
import { buildApprovedResume, countPendingDecisions } from '@/lib/tailor/change-decisions'
import type { StructuredResume } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function corsHeaders(origin: string | null): HeadersInit {
  const allow =
    origin && (origin.startsWith('chrome-extension://') || origin === 'http://localhost:3000')
      ? origin
      : '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

async function resolveUser(request: Request): Promise<
  { userId: string } | { error: string; status: number }
> {
  const auth = request.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!bearer) return { error: 'Unauthorized', status: 401 }
  try {
    const userId = await resolveExtensionUserId(bearer)
    if (!userId) return { error: 'Invalid or revoked token', status: 401 }
    return { userId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth failed'
    const status = message.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500
    return { error: message, status }
  }
}

/**
 * Extension PDF export for a saved job's tailored resume/cover letter.
 * GET ?type=resume|cover&tailoredResumeId=<optional>
 * Accept: application/json → { available, filename?, tailoredResumeId? }
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)
  const { id: jobId } = await context.params

  const authResult = await resolveUser(request)
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status, headers },
    )
  }
  const { userId } = authResult

  const url = new URL(request.url)
  const type = url.searchParams.get('type') === 'cover' ? 'cover' : 'resume'
  const requestedResumeId = url.searchParams.get('tailoredResumeId')?.trim() || null
  const wantsJson =
    (request.headers.get('accept') || '').includes('application/json') &&
    !(request.headers.get('accept') || '').includes('application/pdf')

  const admin = createAdminClient()

  let tailoredResumeId: string | null = null

  if (requestedResumeId) {
    const { data: owned, error: ownedError } = await admin
      .from('tailored_resumes')
      .select('id')
      .eq('id', requestedResumeId)
      .eq('job_id', jobId)
      .eq('user_id', userId)
      .maybeSingle()

    if (ownedError) {
      return NextResponse.json({ error: ownedError.message }, { status: 500, headers })
    }
    if (!owned) {
      return NextResponse.json(
        { error: 'Tailored resume not found for this job' },
        { status: 404, headers },
      )
    }
    tailoredResumeId = owned.id
  } else {
    const { data: app, error: appError } = await admin
      .from('applications')
      .select('id, tailored_resume_id')
      .eq('job_id', jobId)
      .eq('user_id', userId)
      .maybeSingle()

    if (appError) {
      return NextResponse.json({ error: appError.message }, { status: 500, headers })
    }
    tailoredResumeId = app?.tailored_resume_id ?? null
  }

  if (!tailoredResumeId) {
    return NextResponse.json({ available: false }, { status: 200, headers })
  }

  const filename = type === 'cover' ? 'cover-letter.pdf' : 'resume.pdf'

  if (wantsJson) {
    return NextResponse.json(
      { available: true, filename, tailoredResumeId },
      { status: 200, headers },
    )
  }

  const { data: tailored, error: tailoredError } = await admin
    .from('tailored_resumes')
    .select('structured_data, original_structured_data, changes, change_decisions, cover_letter')
    .eq('id', tailoredResumeId)
    .eq('user_id', userId)
    .maybeSingle()

  if (tailoredError) {
    return NextResponse.json({ error: tailoredError.message }, { status: 500, headers })
  }
  if (!tailored) {
    return NextResponse.json({ available: false, tailoredResumeId }, { status: 200, headers })
  }

  const changes = tailored.changes ?? []
  const decisions = tailored.change_decisions ?? {}
  if (type !== 'cover' && changes.length > 0 && countPendingDecisions(changes, decisions) > 0) {
    return NextResponse.json(
      { error: 'Review and accept or decline all changes before exporting' },
      { status: 422, headers },
    )
  }

  const original = (tailored.original_structured_data ?? tailored.structured_data) as StructuredResume
  const exportData = buildApprovedResume(
    original,
    tailored.structured_data as StructuredResume,
    changes,
    decisions,
  )

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { ResumePDF, CoverLetterPDF } = await import('@/lib/export/pdf-generator')

  if (type === 'cover') {
    if (!tailored.cover_letter) {
      return NextResponse.json({ available: false }, { status: 200, headers })
    }
    const buffer = await renderToBuffer(
      React.createElement(CoverLetterPDF, {
        coverLetter: tailored.cover_letter,
        contact: exportData?.contact,
      }) as any,
    )
    return new NextResponse(new Uint8Array(buffer as Buffer), {
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  const buffer = await renderToBuffer(
    React.createElement(ResumePDF, { data: exportData }) as any,
  )
  return new NextResponse(new Uint8Array(buffer as Buffer), {
    headers: {
      ...headers,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
