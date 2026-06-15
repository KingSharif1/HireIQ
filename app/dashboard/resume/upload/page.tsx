'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ResumeUploader } from '@/components/resume/ResumeUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Loader2, FileText, ArrowRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { StructuredResume } from '@/types'

type UploadState = 'idle' | 'uploading' | 'parsing' | 'done' | 'error'

export default function UploadResumePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<StructuredResume | null>(null)
  const [resumeId, setResumeId] = useState<string | null>(null)

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
      const res = await fetch('/api/resume/parse', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setParsedData(data.structuredData)
      setResumeId(data.resumeId)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
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
            <h1 className="text-xl font-bold text-foreground">Resume Parsed!</h1>
            <p className="text-sm text-muted-foreground">AI extracted {parsedData.experience.length} roles and {
              (parsedData.skills.technical.length + parsedData.skills.tools.length)
            } skills</p>
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

        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/resume">View all resumes</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/dashboard/tailor">
              <span>Tailor to a job</span>
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
        <Link href="/dashboard/resume" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Upload Resume</h1>
          <p className="text-sm text-muted-foreground">PDF or DOCX · We&apos;ll parse it with AI</p>
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
              {state === 'uploading' ? 'Uploading file…' : 'AI is reading your resume…'}
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
