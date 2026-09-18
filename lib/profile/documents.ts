import type {
  ProfileData,
  ProfileDocument,
  ProfileDocumentLinkSection,
} from '@/types'

export const DOCUMENT_LINK_SECTIONS: { id: ProfileDocumentLinkSection; label: string }[] = [
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'volunteering', label: 'Volunteering' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'skills', label: 'Skills & certs' },
  { id: 'summary', label: 'Summary' },
  { id: 'additional', label: 'Additional' },
]

const ENTRY_SECTIONS = new Set<ProfileDocumentLinkSection>([
  'projects',
  'experience',
  'education',
  'volunteering',
  'achievements',
])

export function documentLinkHasEntries(section: string | undefined): boolean {
  return Boolean(section && ENTRY_SECTIONS.has(section as ProfileDocumentLinkSection))
}

export function normalizeProfileDocument(raw: Partial<ProfileDocument> | null | undefined): ProfileDocument | null {
  if (!raw || typeof raw !== 'object') return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  if (!id) return null
  const linkedSection = DOCUMENT_LINK_SECTIONS.some(s => s.id === raw.linkedSection)
    ? (raw.linkedSection as ProfileDocumentLinkSection)
    : ''
  const linkedEntryIds = Array.isArray(raw.linkedEntryIds)
    ? raw.linkedEntryIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []
  return {
    id,
    name: typeof raw.name === 'string' ? raw.name : '',
    url: typeof raw.url === 'string' ? raw.url : '',
    note: typeof raw.note === 'string' ? raw.note : '',
    linkedSection,
    linkedEntryIds: documentLinkHasEntries(linkedSection) ? linkedEntryIds : [],
    storagePath: typeof raw.storagePath === 'string' ? raw.storagePath : '',
    fileType: typeof raw.fileType === 'string' ? raw.fileType : '',
  }
}

function documentUrlKey(url: string): string {
  return url.trim().toLowerCase()
}

/**
 * Fold the legacy Attachments list into Additional Documents without duplicating
 * the same id or the same URL.
 */
export function mergeDocumentVault(
  additionalDocuments: ProfileDocument[] | undefined,
  attachments: ProfileDocument[] | undefined
): ProfileDocument[] {
  const merged: ProfileDocument[] = []
  const seenIds = new Set<string>()
  const seenUrls = new Set<string>()

  for (const raw of [...(additionalDocuments ?? []), ...(attachments ?? [])]) {
    const doc = normalizeProfileDocument(raw)
    if (!doc) continue
    if (seenIds.has(doc.id)) continue
    const urlKey = documentUrlKey(doc.url)
    if (urlKey && seenUrls.has(urlKey)) continue
    seenIds.add(doc.id)
    if (urlKey) seenUrls.add(urlKey)
    merged.push(doc)
  }

  return merged
}

export function entriesForDocumentLink(
  section: ProfileDocumentLinkSection | '' | undefined,
  data: ProfileData
): { id: string; label: string }[] {
  switch (section) {
    case 'projects':
      return data.projects.map(p => ({ id: p.id, label: p.name.trim() || 'Untitled project' }))
    case 'experience':
      return data.experience.map(e => ({
        id: e.id,
        label: [e.title, e.company].filter(Boolean).join(' @ ') || 'Untitled role',
      }))
    case 'education':
      return data.education.map(e => ({
        id: e.id,
        label: [e.degree, e.institution].filter(Boolean).join(' · ') || 'Untitled school',
      }))
    case 'volunteering':
      return data.volunteering.map(v => ({
        id: v.id,
        label: [v.role, v.organization].filter(Boolean).join(' @ ') || 'Untitled volunteer role',
      }))
    case 'achievements':
      return data.achievements.map(a => ({
        id: a.id,
        label: a.title.trim() || 'Untitled achievement',
      }))
    default:
      return []
  }
}

export function documentReferralLabel(doc: ProfileDocument, data: ProfileData): string | null {
  const section = DOCUMENT_LINK_SECTIONS.find(s => s.id === doc.linkedSection)
  if (!section) return null
  if (!documentLinkHasEntries(section.id) || !doc.linkedEntryIds?.length) {
    return section.label
  }
  const entries = entriesForDocumentLink(section.id, data)
  const names = doc.linkedEntryIds
    .map(id => entries.find(e => e.id === id)?.label)
    .filter((label): label is string => Boolean(label))
  if (names.length === 0) return section.label
  if (names.length === 1) return `${section.label} · ${names[0]}`
  return `${section.label} · ${names[0]} +${names.length - 1}`
}

export function isOriginalPdf(fileType: string | null | undefined, fileUrl: string | null | undefined): boolean {
  const type = (fileType ?? '').toLowerCase()
  if (type.includes('word') || type === 'docx' || type.includes('officedocument')) return false
  if (type.includes('pdf') || type === 'pdf') return true
  const url = (fileUrl ?? '').toLowerCase()
  if (url.includes('.docx')) return false
  if (url.includes('.pdf')) return true
  return false
}

/** Storage object path from a public/signed resumes URL, or a raw bucket path. */
export function resumeStoragePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (!trimmed.includes('://') && trimmed.includes('/')) {
    return trimmed.replace(/^\/+/, '')
  }
  const match =
    trimmed.match(/\/object\/(?:public|sign|authenticated)\/resumes\/([^?]+)/i) ??
    trimmed.match(/\/sign\/resumes\/([^?]+)/i)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function extraDocumentFilePath(docId: string): string {
  return `/api/profile/documents/${docId}/file`
}

export function extraDocumentStoragePath(userId: string, docId: string, kind: 'pdf' | 'docx'): string {
  return `${userId}/docs/${docId}.${kind}`
}

export function extraDocumentFileName(doc: { name?: string; storagePath?: string; fileType?: string }): string {
  const fromPath = doc.storagePath?.split('/').pop()
  if (fromPath) return fromPath
  const ext = (doc.fileType ?? '').includes('word') || doc.fileType === 'docx' ? 'docx' : 'pdf'
  const base = (doc.name ?? 'document').replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'document'
  return `${base}.${ext}`
}

export function resumeFileContentType(fileType: string | null | undefined, path: string): string {
  const type = (fileType ?? '').toLowerCase()
  const lowerPath = path.toLowerCase()
  if (type.includes('word') || type === 'docx' || lowerPath.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return 'application/pdf'
}

export function originalResumeFilePath(resumeId: string): string {
  return `/api/resume/${resumeId}/file`
}
