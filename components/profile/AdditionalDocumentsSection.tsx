'use client'

import { useRef, useState } from 'react'
import { ExternalLink, FileUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState, EntryCard, Field, NativeSelect, SectionHeader } from '@/components/profile/primitives'
import { uid } from '@/lib/profile/data'
import {
  DOCUMENT_LINK_SECTIONS,
  documentLinkHasEntries,
  documentReferralLabel,
  entriesForDocumentLink,
  extraDocumentFilePath,
  isOriginalPdf,
} from '@/lib/profile/documents'
import { focusNewEntry } from '@/lib/profile/focus-entry'
import type { ProfileData, ProfileDocument, ProfileDocumentLinkSection } from '@/types'

type Update = (patch: Partial<ProfileData>) => void

export function AdditionalDocumentsSection({ data, update }: { data: ProfileData; update: Update }) {
  const docs = data.additionalDocuments
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const add = () => {
    const item: ProfileDocument = {
      id: uid('doc'),
      name: '',
      url: '',
      note: '',
      linkedSection: '',
      linkedEntryIds: [],
    }
    update({ additionalDocuments: [item, ...docs], attachments: [] })
    focusNewEntry(item.id)
  }

  const setItem = (id: string, patch: Partial<ProfileDocument>) =>
    update({
      additionalDocuments: docs.map(d => (d.id === id ? { ...d, ...patch } : d)),
      attachments: [],
    })

  const remove = (id: string) => {
    const doc = docs.find(d => d.id === id)
    if (doc?.storagePath) {
      void fetch(extraDocumentFilePath(id), { method: 'DELETE' })
    }
    update({
      additionalDocuments: docs.filter(d => d.id !== id),
      attachments: [],
    })
  }

  async function uploadFile(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const id = uid('doc')
      const form = new FormData()
      form.set('file', file)
      form.set('id', id)
      const res = await fetch('/api/profile/documents/upload', { method: 'POST', body: form })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        id?: string
        name?: string
        storagePath?: string
        fileType?: string
      }
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      const item: ProfileDocument = {
        id: json.id || id,
        name: json.name || file.name.replace(/\.[^.]+$/, ''),
        url: '',
        note: '',
        linkedSection: '',
        linkedEntryIds: [],
        storagePath: json.storagePath,
        fileType: json.fileType,
      }
      update({ additionalDocuments: [item, ...docs], attachments: [] })
      focusNewEntry(item.id)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <SectionHeader
        title="Additional Documents"
        description="Transcripts, references, portfolios. Upload a PDF or DOCX, or keep a labeled link. Point a doc at a project or another section so you know why it is here."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) void uploadFile(file)
              }}
            />
            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload PDF/DOCX'}
            </Button>
            <Button size="sm" type="button" onClick={add}>
              <Plus className="h-4 w-4" />
              Add link
            </Button>
          </div>
        }
      />
      {uploadError ? <p className="mb-3 text-sm text-destructive">{uploadError}</p> : null}
      {docs.length === 0 ? (
        <EmptyState message="Nothing here yet." actionLabel="Add link" onAction={add} />
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <DocumentCard
              key={doc.id}
              data={data}
              doc={doc}
              onChange={patch => setItem(doc.id, patch)}
              onRemove={() => remove(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentCard({
  data,
  doc,
  onChange,
  onRemove,
}: {
  data: ProfileData
  doc: ProfileDocument
  onChange: (patch: Partial<ProfileDocument>) => void
  onRemove: () => void
}) {
  const linkedSection = (doc.linkedSection || '') as ProfileDocumentLinkSection | ''
  const entries = entriesForDocumentLink(linkedSection, data)
  const referral = documentReferralLabel(doc, data)
  const fileHref = doc.storagePath ? extraDocumentFilePath(doc.id) : ''
  const pdf = Boolean(doc.storagePath) && isOriginalPdf(doc.fileType, doc.storagePath)
  const subtitle = referral || (doc.storagePath ? 'Uploaded file' : doc.url)

  function setSection(next: string) {
    const linked = DOCUMENT_LINK_SECTIONS.some(s => s.id === next)
      ? (next as ProfileDocumentLinkSection)
      : ''
    onChange({
      linkedSection: linked,
      linkedEntryIds: [],
    })
  }

  function toggleEntry(entryId: string) {
    const current = doc.linkedEntryIds ?? []
    const linkedEntryIds = current.includes(entryId)
      ? current.filter(id => id !== entryId)
      : [...current, entryId]
    onChange({ linkedEntryIds })
  }

  return (
    <EntryCard
      entryId={doc.id}
      title={doc.name || 'New document'}
      subtitle={subtitle}
      onRemove={onRemove}
      defaultOpen={!doc.name}
    >
      <Field label="Label" hint="What this is, in your words.">
        <Input
          value={doc.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Transcript, reference letter, portfolio…"
        />
      </Field>
      {fileHref ? (
        <Field label="File">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={fileHref} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open {pdf ? 'PDF' : 'file'}
              </a>
            </Button>
            <span className="text-xs text-muted-foreground">
              {pdf ? 'PDF stored in HireIQ' : 'DOCX stored in HireIQ'}
            </span>
          </div>
        </Field>
      ) : null}
      <Field label="Link" hint={fileHref ? 'Optional extra URL.' : 'A public URL, if you are not uploading a file.'}>
        <Input
          value={doc.url}
          onChange={e => onChange({ url: e.target.value })}
          placeholder="https://…"
        />
      </Field>
      <Field label="Note">
        <Input
          value={doc.note}
          onChange={e => onChange({ note: e.target.value })}
          placeholder="Optional context"
        />
      </Field>
      <Field
        label="Refers to"
        hint="Optional. Tie this file to a project, a job, or another profile section."
      >
        <NativeSelect value={linkedSection} onChange={setSection} aria-label="Linked section">
          <option value="">None</option>
          {DOCUMENT_LINK_SECTIONS.map(section => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {documentLinkHasEntries(linkedSection) ? (
        <Field label="Specific entries">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing in that section yet.</p>
          ) : (
            <div className="space-y-1.5 rounded-lg border border-border bg-secondary/30 p-2">
              {entries.map(entry => {
                const checked = (doc.linkedEntryIds ?? []).includes(entry.id)
                return (
                  <label
                    key={entry.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/70"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={checked}
                      onChange={() => toggleEntry(entry.id)}
                    />
                    <span className="min-w-0 truncate text-foreground">{entry.label}</span>
                  </label>
                )
              })}
            </div>
          )}
        </Field>
      ) : null}
    </EntryCard>
  )
}
