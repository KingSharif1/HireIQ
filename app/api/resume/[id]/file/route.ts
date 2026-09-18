import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getResume } from '@/lib/supabase/queries'
import {
  resumeFileContentType,
  resumeStoragePathFromUrl,
} from '@/lib/profile/documents'
import { downloadResumeObject } from '@/lib/storage/download-resume'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: resume, error } = await getResume(supabase, id)
  if (error || !resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }
  if (resume.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const path = resumeStoragePathFromUrl(resume.original_file_url)
  if (!path) {
    return NextResponse.json({ error: 'No original file stored' }, { status: 404 })
  }

  const ownerPrefix = `${user.id}/`
  if (!path.startsWith(ownerPrefix)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data = await downloadResumeObject(path, supabase)
  if (!data) {
    return NextResponse.json({ error: 'Could not load original file' }, { status: 404 })
  }

  const download = new URL(request.url).searchParams.get('download') === '1'
  const filename = path.split('/').pop() || 'resume.pdf'

  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': resumeFileContentType(resume.original_file_type, path),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'private, max-age=60',
    },
  })
}
