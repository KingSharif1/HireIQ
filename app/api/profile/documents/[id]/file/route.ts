import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extraDocumentFileName, resumeFileContentType } from '@/lib/profile/documents'
import { resolveProfileData } from '@/lib/profile/data'
import { patchAdditionalDocuments } from '@/lib/profile/extra-document-store'
import { downloadResumeObject, removeResumeObject } from '@/lib/storage/download-resume'
import type { Profile } from '@/types'

async function ownedExtraDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  docId: string
) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, profile_data')
    .eq('id', userId)
    .single<Pick<Profile, 'first_name' | 'last_name' | 'email' | 'profile_data'>>()

  if (error || !profile) return null
  const data = resolveProfileData(profile)
  const doc = data.additionalDocuments.find(item => item.id === docId)
  if (!doc?.storagePath) return null
  if (!doc.storagePath.startsWith(`${userId}/`)) return null
  return doc
}

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

  const doc = await ownedExtraDocument(supabase, user.id, id)
  if (!doc?.storagePath) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const file = await downloadResumeObject(doc.storagePath, supabase)
  if (!file) {
    return NextResponse.json({ error: 'Could not load that file' }, { status: 404 })
  }

  const download = new URL(request.url).searchParams.get('download') === '1'
  const filename = extraDocumentFileName(doc)

  return new NextResponse(file, {
    status: 200,
    headers: {
      'Content-Type': resumeFileContentType(doc.fileType, doc.storagePath),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'private, max-age=60',
    },
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doc = await ownedExtraDocument(supabase, user.id, id)
  if (!doc?.storagePath) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const removed = await removeResumeObject(doc.storagePath, supabase)
  if (!removed) {
    return NextResponse.json({ error: 'Could not delete that file' }, { status: 500 })
  }
  const persist = await patchAdditionalDocuments(supabase, user.id, docs =>
    docs.filter(item => item.id !== id)
  )
  if (persist.error) {
    console.error('[profile-documents] remove persist failed', persist.error)
  }
  return NextResponse.json({ ok: true })
}
