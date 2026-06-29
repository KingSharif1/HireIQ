import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildApprovedResume, countPendingDecisions } from '@/lib/tailor/change-decisions'
import type { StructuredResume } from '@/types'
import React from 'react'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tailoredResumeId, type } = await request.json() as {
    tailoredResumeId: string
    type?: 'resume' | 'cover'
  }

  const { data: tailored } = await supabase
    .from('tailored_resumes')
    .select('structured_data, original_structured_data, changes, change_decisions, cover_letter')
    .eq('id', tailoredResumeId)
    .eq('user_id', user.id)
    .single()

  if (!tailored) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const changes = tailored.changes ?? []
  const decisions = tailored.change_decisions ?? {}
  if (type !== 'cover' && changes.length > 0 && countPendingDecisions(changes, decisions) > 0) {
    return NextResponse.json(
      { error: 'Review and accept or decline all changes before exporting' },
      { status: 422 }
    )
  }

  const original = (tailored.original_structured_data ?? tailored.structured_data) as StructuredResume
  const exportData = buildApprovedResume(
    original,
    tailored.structured_data as StructuredResume,
    changes,
    decisions
  )

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { ResumePDF, CoverLetterPDF } = await import('@/lib/export/pdf-generator')

  if (type === 'cover') {
    if (!tailored.cover_letter) {
      return NextResponse.json({ error: 'No cover letter to export' }, { status: 400 })
    }
    const buffer = await renderToBuffer(
      React.createElement(CoverLetterPDF, {
        coverLetter: tailored.cover_letter,
        contact: exportData?.contact,
      }) as any
    )
    return new NextResponse(new Uint8Array(buffer as Buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="cover-letter.pdf"',
      },
    })
  }

  const buffer = await renderToBuffer(React.createElement(ResumePDF, { data: exportData }) as any)

  return new NextResponse(new Uint8Array(buffer as Buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"',
    },
  })
}
