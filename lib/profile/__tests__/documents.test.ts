import { describe, expect, it } from 'vitest'
import { emptyProfileData } from '@/lib/profile/data'
import {
  documentReferralLabel,
  extraDocumentStoragePath,
  isOriginalPdf,
  mergeDocumentVault,
  resumeStoragePathFromUrl,
} from '@/lib/profile/documents'

describe('mergeDocumentVault', () => {
  it('folds attachments into additional documents without duplicating id or url', () => {
    const additional = [
      { id: 'doc-1', name: 'Transcript', url: 'https://example.com/t', note: '' },
    ]
    const attachments = [
      { id: 'doc-1', name: 'Duplicate id', url: 'https://other.example/t', note: '' },
      { id: 'doc-2', name: 'Same url', url: 'https://example.com/t', note: '' },
      { id: 'doc-3', name: 'Reference', url: 'https://example.com/ref', note: 'Dean' },
    ]

    const merged = mergeDocumentVault(additional, attachments)
    expect(merged.map(d => d.id)).toEqual(['doc-1', 'doc-3'])
    expect(merged[1]?.name).toBe('Reference')
  })

  it('normalizes missing link fields', () => {
    const merged = mergeDocumentVault(
      [{ id: 'doc-1', name: 'A', url: '', note: '', linkedSection: 'projects', linkedEntryIds: ['proj-1'] }],
      []
    )
    expect(merged[0]?.linkedSection).toBe('projects')
    expect(merged[0]?.linkedEntryIds).toEqual(['proj-1'])
  })
})

describe('documentReferralLabel', () => {
  it('names a linked project', () => {
    const data = emptyProfileData()
    data.projects = [
      {
        id: 'proj-1',
        name: 'NEMT Billing',
        description: '',
        bullets: [],
        technologies: [],
        url: '',
        github: '',
      },
    ]
    const label = documentReferralLabel(
      {
        id: 'doc-1',
        name: 'Spec',
        url: 'https://example.com/spec',
        note: '',
        linkedSection: 'projects',
        linkedEntryIds: ['proj-1'],
      },
      data
    )
    expect(label).toBe('Projects · NEMT Billing')
  })
})

describe('isOriginalPdf', () => {
  it('treats stored pdf type as previewable', () => {
    expect(isOriginalPdf('pdf', 'https://cdn.example/file')).toBe(true)
    expect(isOriginalPdf('docx', 'https://cdn.example/file')).toBe(false)
    expect(isOriginalPdf(null, 'https://cdn.example/resume.pdf')).toBe(true)
  })
})

describe('resumeStoragePathFromUrl', () => {
  it('reads the object path from a public resumes URL', () => {
    expect(
      resumeStoragePathFromUrl(
        'https://example.supabase.co/storage/v1/object/public/resumes/user-1/123.pdf'
      )
    ).toBe('user-1/123.pdf')
  })

  it('reads authenticated and raw bucket paths', () => {
    expect(
      resumeStoragePathFromUrl(
        'https://example.supabase.co/storage/v1/object/authenticated/resumes/user-1/123.pdf'
      )
    ).toBe('user-1/123.pdf')
    expect(resumeStoragePathFromUrl('user-1/docs/abc.docx')).toBe('user-1/docs/abc.docx')
  })
})

describe('extra document helpers', () => {
  it('builds a user-scoped docs path', () => {
    expect(extraDocumentStoragePath('user-1', 'doc-9', 'pdf')).toBe('user-1/docs/doc-9.pdf')
  })
})
