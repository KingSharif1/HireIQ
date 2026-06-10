import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import React from 'react'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tailoredResumeId } = await request.json()

  const { data: tailored } = await supabase
    .from('tailored_resumes')
    .select('structured_data')
    .eq('id', tailoredResumeId)
    .eq('user_id', user.id)
    .single()

  if (!tailored) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { ResumePDF } = await import('@/lib/export/pdf-generator')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(ResumePDF, { data: tailored.structured_data }) as any)

  return new NextResponse(new Uint8Array(buffer as Buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"',
    },
  })
}
