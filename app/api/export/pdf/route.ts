import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildApprovedResume, countPendingDecisions } from '@/lib/tailor/change-decisions'
import { getMasterResumeContext } from '@/lib/profile/master'
import { polishStructuredForExport, filterResumeBySections } from '@/lib/export/format'
import {
  DEFAULT_RESUME_THEME,
  mergeResumeTheme,
  type ResumeThemeOverride,
} from '@/lib/export/theme'
import type { ResumeInclusion, StructuredResume } from '@/types'
import React from 'react'

export const runtime = 'nodejs'
export const maxDuration = 60

type ExportBody = {
  tailoredResumeId?: string
  /** Export the master profile resume (no tailored id). */
  source?: 'master' | 'tailored'
  type?: 'resume' | 'cover'
  /** Optional section/order/layout override for this export only. */
  themeOverride?: ResumeThemeOverride | null
  inclusion?: ResumeInclusion | null
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as ExportBody
  const { tailoredResumeId, type, themeOverride, inclusion } = body
  const source = body.source ?? (tailoredResumeId ? 'tailored' : 'master')

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { ResumePDF, CoverLetterPDF } = await import('@/lib/export/pdf-generator')

  if (source === 'master') {
    const master = await getMasterResumeContext(supabase, user.id, null)
    if ('error' in master) {
      return NextResponse.json({ error: master.error }, { status: master.status })
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('resume_theme')
      .eq('id', user.id)
      .maybeSingle()

    let exportData = polishStructuredForExport(master.structured)
    if (inclusion?.sectionIds) {
      exportData = polishStructuredForExport(
        filterResumeBySections(exportData, inclusion.sectionIds)
      )
    }
    const theme = mergeResumeTheme(
      DEFAULT_RESUME_THEME,
      (themeOverride ?? profile?.resume_theme ?? null) as ResumeThemeOverride | null
    )

    const { runResumeLayoutCheck } = await import('@/lib/resume/layout-check')
    const layout = runResumeLayoutCheck(exportData)
    if (!layout.ok) {
      return NextResponse.json(
        {
          error: 'Fix resume layout issues before exporting',
          layoutIssues: layout.issues.filter(issue => issue.severity === 'critical'),
        },
        { status: 422 },
      )
    }

    const buffer = await renderToBuffer(
      React.createElement(ResumePDF, { data: exportData, theme }) as any
    )
    return new NextResponse(new Uint8Array(buffer as Buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="master-resume.pdf"',
      },
    })
  }

  if (!tailoredResumeId) {
    return NextResponse.json({ error: 'tailoredResumeId or source=master required' }, { status: 400 })
  }

  const { data: tailored } = await supabase
    .from('tailored_resumes')
    .select(
      'structured_data, original_structured_data, changes, change_decisions, cover_letter, theme_override'
    )
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
  const exportData = polishStructuredForExport(
    buildApprovedResume(
      original,
      tailored.structured_data as StructuredResume,
      changes,
      decisions
    )
  )

  if (type !== 'cover') {
    const { runResumeLayoutCheck } = await import('@/lib/resume/layout-check')
    const layout = runResumeLayoutCheck(exportData)
    if (!layout.ok) {
      return NextResponse.json(
        {
          error: 'Fix resume layout issues before exporting',
          layoutIssues: layout.issues.filter(issue => issue.severity === 'critical'),
        },
        { status: 422 },
      )
    }
  }

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

  const theme = mergeResumeTheme(
    DEFAULT_RESUME_THEME,
    (themeOverride ?? tailored.theme_override ?? null) as ResumeThemeOverride | null
  )

  const buffer = await renderToBuffer(
    React.createElement(ResumePDF, { data: exportData, theme }) as any
  )

  return new NextResponse(new Uint8Array(buffer as Buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"',
    },
  })
}
