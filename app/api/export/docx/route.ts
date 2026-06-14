import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDocx, generateCoverDocx } from '@/lib/export/docx-generator'

export const runtime = 'nodejs'
export const maxDuration = 60

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

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
    .select('structured_data, cover_letter')
    .eq('id', tailoredResumeId)
    .eq('user_id', user.id)
    .single()

  if (!tailored) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (type === 'cover') {
    if (!tailored.cover_letter) {
      return NextResponse.json({ error: 'No cover letter to export' }, { status: 400 })
    }
    const coverBuffer = await generateCoverDocx(tailored.cover_letter, tailored.structured_data?.contact)
    return new NextResponse(new Uint8Array(coverBuffer), {
      headers: {
        'Content-Type': DOCX_MIME,
        'Content-Disposition': 'attachment; filename="cover-letter.docx"',
      },
    })
  }

  const buffer = await generateDocx(tailored.structured_data)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': DOCX_MIME,
      'Content-Disposition': 'attachment; filename="resume.docx"',
    },
  })
}
