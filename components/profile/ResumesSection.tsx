'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Star, ExternalLink, Upload, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MasterExportDialog } from '@/components/profile/MasterExportPanel'
import { EmptyState, SectionHeader } from '@/components/profile/primitives'
import { isOriginalPdf, originalResumeFilePath } from '@/lib/profile/documents'
import type { ResumeRow } from '@/lib/profile/resume-row'
import { cn } from '@/lib/utils'
import type { ProfileData } from '@/types'
import type { ResumeTheme } from '@/lib/export/theme'

export function ResumesSection({
  resumes,
  data,
  savedTheme,
}: {
  resumes: ResumeRow[]
  data: ProfileData
  savedTheme?: ResumeTheme | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(resumes[0]?.id ?? null)
  const [exportOpen, setExportOpen] = useState(false)
  const selected = resumes.find(r => r.id === selectedId) ?? resumes[0] ?? null

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Resumes"
        description="Uploads that seed your master profile. Open one to view the original, then replace or delete from the card."
        action={
          <Button size="sm" asChild>
            <Link href="/dashboard/resume/upload">
              <Upload className="h-4 w-4" />
              Upload
            </Link>
          </Button>
        }
      />

      {resumes.length === 0 ? (
        <EmptyState
          message="No resumes uploaded yet."
          actionLabel="Upload resume"
          onAction={() => {
            window.location.href = '/dashboard/resume/upload'
          }}
        />
      ) : (
        <div className="space-y-3">
          {resumes.map(resume => (
            <ResumeRowCard
              key={resume.id}
              resume={resume}
              selected={selected?.id === resume.id}
              onSelect={() => setSelectedId(resume.id)}
              onExport={() => setExportOpen(true)}
            />
          ))}
        </div>
      )}

      {selected ? <OriginalResumeViewer resume={selected} /> : null}

      <MasterExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        data={data}
        savedTheme={savedTheme}
      />
    </div>
  )
}

function ResumeRowCard({
  resume,
  selected,
  onSelect,
  onExport,
}: {
  resume: ResumeRow
  selected: boolean
  onSelect: () => void
  onExport: () => void
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function handleDelete() {
    if (!confirm) {
      setConfirm(true)
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/resume/${resume.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || 'Delete failed')
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete resume')
      setConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card
      className={cn(
        'transition-colors group',
        selected ? 'border-foreground/40 ring-1 ring-foreground/15' : 'hover:border-brand-purple/40'
      )}
    >
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-purple/10">
            <FileText className="h-5 w-5 text-brand-purple" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">{resume.title}</p>
              {resume.is_primary ? (
                <Star className="h-3.5 w-3.5 fill-brand-amber text-brand-amber" />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {resume.ats_format_score != null
                ? `Format score: ${resume.ats_format_score}%`
                : 'Click to view the original'}
            </p>
          </div>
        </button>

        <div className="flex flex-shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" type="button" title="Export master PDF" onClick={onExport}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
          {resume.original_file_url ? (
            <Button variant="ghost" size="sm" asChild title="Open original in a new tab">
              <a href={originalResumeFilePath(resume.id)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" asChild title="Replace / upload new">
            <Link href="/dashboard/resume/upload">
              <Upload className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            type="button"
            variant={confirm ? 'destructive' : 'ghost'}
            size="sm"
            disabled={deleting}
            onClick={() => void handleDelete()}
            onBlur={() => setConfirm(false)}
            title="Delete resume"
          >
            <Trash2 className="h-4 w-4" />
            {confirm ? 'Confirm' : ''}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function OriginalResumeViewer({ resume }: { resume: ResumeRow }) {
  const fileHref = originalResumeFilePath(resume.id)
  const pdf = isOriginalPdf(resume.original_file_type, resume.original_file_url)
  const hasFile = Boolean(resume.original_file_url)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    if (!hasFile || !pdf) {
      setStatus('idle')
      setObjectUrl(null)
      return
    }

    let cancelled = false
    let created: string | null = null
    setStatus('loading')
    setObjectUrl(null)

    void fetch(fileHref)
      .then(async res => {
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error || `Could not load original (${res.status})`)
        }
        return res.blob()
      })
      .then(blob => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setObjectUrl(created)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [fileHref, hasFile, pdf])

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{resume.title}</p>
          <p className="text-xs text-muted-foreground">
            {pdf ? 'Original upload' : hasFile ? 'Original upload — open the file to view it' : 'No original file stored'}
          </p>
        </div>
        {hasFile ? (
          <Button variant="ghost" size="sm" asChild>
            <a href={fileHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </Button>
        ) : null}
      </div>
      {pdf && hasFile && status === 'ready' && objectUrl ? (
        <iframe
          title={`${resume.title} original PDF`}
          src={`${objectUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          className="h-[min(72vh,860px)] min-h-[32rem] w-full bg-white"
        />
      ) : (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          {!hasFile
            ? 'This resume has no stored original file. Upload a PDF to preview it here.'
            : !pdf
              ? 'This file is not a PDF, so it cannot preview here. Open the original to view it.'
              : status === 'error'
                ? 'Could not load the original file. Open it in a new tab, or upload the PDF again.'
                : 'Loading original…'}
        </div>
      )}
    </div>
  )
}
