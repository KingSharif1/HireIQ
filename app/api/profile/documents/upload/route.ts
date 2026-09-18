import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uid } from '@/lib/profile/data'
import { extraDocumentStoragePath, resumeFileContentType } from '@/lib/profile/documents'
import { patchAdditionalDocuments } from '@/lib/profile/extra-document-store'
import { MAX_RESUME_UPLOAD_BYTES, MAX_RESUME_UPLOAD_LABEL } from '@/lib/resume/extract-text'

export const runtime = 'nodejs'

function fileKind(file: File): 'pdf' | 'docx' | null {
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()
  if (name.endsWith('.pdf') || type === 'application/pdf') return 'pdf'
  if (
    name.endsWith('.docx') ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx'
  }
  return null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_RESUME_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is too large. Max ${MAX_RESUME_UPLOAD_LABEL}.` },
      { status: 413 }
    )
  }

  const kind = fileKind(file)
  if (!kind) {
    return NextResponse.json({ error: 'Upload a PDF or DOCX.' }, { status: 400 })
  }

  const requestedId = typeof formData.get('id') === 'string' ? String(formData.get('id')).trim() : ''
  const id = requestedId || uid('doc')
  const storagePath = extraDocumentStoragePath(user.id, id, kind)
  const buffer = Buffer.from(await file.arrayBuffer())
  const contentType = resumeFileContentType(kind, storagePath)

  const { error } = await supabase.storage.from('resumes').upload(storagePath, buffer, {
    contentType,
    upsert: true,
  })
  if (error) {
    console.error('[profile-documents] upload failed', error.message)
    return NextResponse.json({ error: 'Could not store that file' }, { status: 500 })
  }

  const name = file.name.replace(/\.[^.]+$/, '').trim() || 'Untitled document'
  const item = {
    id,
    name,
    url: '',
    note: '',
    linkedSection: '' as const,
    linkedEntryIds: [],
    storagePath,
    fileType: kind,
  }
  const persist = await patchAdditionalDocuments(supabase, user.id, docs => [
    item,
    ...docs.filter(doc => doc.id !== id),
  ])
  if (persist.error) {
    console.error('[profile-documents] persist failed', persist.error)
    return NextResponse.json({ error: 'File stored, but the profile did not save. Try again.' }, { status: 500 })
  }

  return NextResponse.json({
    id,
    name,
    storagePath,
    fileType: kind,
  })
}
