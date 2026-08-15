'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { ResumeUploader } from '@/components/resume/ResumeUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Loader2, FileText, ArrowRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { StructuredResume } from '@/types'
import { AiModelHint } from '@/components/ai/AiModelHint'
import type { ParseAdditions } from '@/lib/profile/parse-additions'
import { readNdjsonResponse } from '@/lib/ai/ndjson-stream'

type UploadState = 'idle' | 'uploading' | 'parsing' | 'done' | 'error'

export default function UploadResumePage() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [state, setState] = useState<UploadState>('idle')
  const [parseDetail, setParseDetail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<StructuredResume | null>(null)
  const [resumeId, setResumeId] = useState<string | null>(null)
  const [replaced, setReplaced] = useState(false)
  const [hasAdditions, setHasAdditions] = useState(false)
  const [additions, setAdditions] = useState<ParseAdditions | null>(null)
  const [merging, setMerging] = useState(false)
  const [merged, setMerged] = useState(false)

  function handleFileSelect(f: File) {
    setFile(f)
    setError(null)
    if (!title) {
      setTitle(f.name.replace(/\.(pdf|docx)$/i, ''))
    }
  }

  async function handleUpload() {
    if (!file) return
    setState('uploading')
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title || file.name)

    try {
      setState('parsing')
      setParseDetail('Reading your resume')
      const res = await fetch('/api/resume/parse', { method: 'POST', body: formData })
      if (!res.ok && !res.headers.get('content-type')?.includes('ndjson')) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'Upload failed')
      }
      const data = await readNdjsonResponse<{
        resumeId: string
        structuredData: StructuredResume
        replaced?: boolean
        hasAdditions?: boolean
        additions?: ParseAdditions | null
      }>(res, detail => setParseDetail(detail))

      setParsedData(data.structuredData)
      setResumeId(data.resumeId)
      setReplaced(Boolean(data.replaced))
      setHasAdditions(Boolean(data.hasAdditions))
      setAdditions(data.additions ?? null)
      setMerged(false)
      setState('done')
      setParseDetail(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
      setParseDetail(null)
    }
  }

  async function mergeIntoMaster() {
    if (!resumeId) return
    setMerging(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/merge-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update profile')
      setMerged(true)
      setHasAdditions(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile')
    } finally {
      setMerging(false)
    }
  }

  if (state === 'done' && parsedData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-brand-green/15 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-brand-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {replaced ? 'Source resume replaced' : 'Resume parsed'}
            </h1>
            <p className="text-sm text-muted-foreground">
              AI extracted {parsedData.experience.length} roles and{' '}
              {parsedData.skills.technical.length + parsedData.skills.tools.length} skills
            </p>
          </div>
        </div>

        {/* Summary card */}
        <Card className="mb-6">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-brand-purple" />
              <div>
                <p className="font-medium">{parsedData.contact.name || 'Name not found'}</p>
                <p className="text-sm text-muted-foreground">{parsedData.contact.email}</p>
              </div>
            </div>

            {parsedData.summary && (
              <p className="text-sm text-muted-foreground line-clamp-3">{parsedData.summary}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {parsedData.skills.technical.slice(0, 8).map(skill => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))}
              {parsedData.skills.technical.length > 8 && (
                <Badge variant="muted">+{parsedData.skills.technical.length - 8} more</Badge>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{parsedData.experience.length}</p>
                <p className="text-xs text-muted-foreground">Roles</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{parsedData.education.length}</p>
                <p className="text-xs text-muted-foreground">Education</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{parsedData.projects.length}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {replaced && !merged ? (
          <p className="mb-4 text-sm text-muted-foreground">
            Your master profile was left as-is. We can add anything new from this file if you want.
          </p>
        ) : null}

        {hasAdditions && additions ? (
          <Card className="mb-6">
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-medium text-foreground">Add new items to your master profile?</p>
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {additions.experience.length > 0 ? (
                  <li>
                    {additions.experience.length} new{' '}
                    {additions.experience.length === 1 ? 'role' : 'roles'}
                    {additions.experience
                      .slice(0, 3)
                      .map(e => ` (${e.title} · ${e.company})`)
                      .join('')}
                  </li>
                ) : null}
                {additions.projects.length > 0 ? (
                  <li>
                    {additions.projects.length} new{' '}
                    {additions.projects.length === 1 ? 'project' : 'projects'}
                  </li>
                ) : null}
                {additions.skills.length > 0 ? (
                  <li>{additions.skills.length} new skills</li>
                ) : null}
              </ul>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void mergeIntoMaster()} disabled={merging}>
                  {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Add to master
                </Button>
                <Button variant="outline" onClick={() => setHasAdditions(false)}>
                  Keep master as-is
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {merged ? (
          <p className="mb-4 text-sm text-foreground">Added to your master profile.</p>
        ) : null}

        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/builder">Back to files</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/dashboard/profile">
              <span>Open profile</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/builder" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Upload resume</h1>
          <p className="text-sm text-muted-foreground">
            One PDF or DOCX at a time. Replacing updates the source file — we&apos;ll ask before changing your master profile.
          </p>
          <div className="mt-1"><AiModelHint uses="strong" /></div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <ResumeUploader
            onFileSelect={handleFileSelect}
            disabled={state === 'parsing' || state === 'uploading'}
          />

          {file && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary rounded-lg px-3 py-2">
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="ml-auto flex-shrink-0">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Resume title
                </label>
                <Input
                  placeholder="e.g. Software Engineer Resume"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={state === 'parsing' || state === 'uploading'}
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {(state === 'uploading' || state === 'parsing') && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {state === 'uploading'
                ? 'Uploading file…'
                : parseDetail || 'AI is reading your resume…'}
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || state === 'uploading' || state === 'parsing'}
            className="w-full"
          >
            {state === 'parsing' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Parsing with AI…
              </>
            ) : 'Upload & Parse'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
