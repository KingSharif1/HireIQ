/**
 * Frontend API client — all HTTP calls to /api/* go through here.
 * Import these functions in components and hooks instead of calling fetch directly.
 */
import type {
  ATSScore,
  GapQuestion,
  StructuredResume,
  ResumeDiffChange,
  JobExtractedData,
} from '@/types'
import type { TailorProcessLogEntry } from '@/lib/tailor/process-log'

// ---------------------------------------------------------------------------
// Shared error type
// ---------------------------------------------------------------------------

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'APIError'
  }
}

async function post<T>(
  path: string,
  body: Record<string, unknown>,
  options?: { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 55_000
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({ error: res.statusText }))) as {
        error?: string
        processLog?: TailorProcessLogEntry[]
      }
      throw new APIError(res.status, data.error ?? 'Request failed', {
        processLog: data.processLog,
      })
    }
    return res.json()
  } catch (err) {
    if (err instanceof APIError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new APIError(
        408,
        'Analysis is taking too long. Check Settings → AI (Claude key) and try again.',
      )
    }
    throw err
  } finally {
    window.clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

export interface ParseResumeResult {
  resumeId: string
  structuredData: StructuredResume
  atsFormatScore: number
}

export async function parseResume(file: File, title?: string): Promise<ParseResumeResult> {
  const form = new FormData()
  form.append('file', file)
  if (title) form.append('title', title)

  const res = await fetch('/api/resume/parse', { method: 'POST', body: form })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }))
    throw new APIError(res.status, data.error ?? 'Failed to parse resume')
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export interface AnalyzeJobResult {
  jobId: string
  extractedData: JobExtractedData
}

export async function analyzeJob(params: {
  description: string
  title?: string
  company?: string
  location?: string
  applyUrl?: string
  source?: string
}): Promise<AnalyzeJobResult> {
  return post('/api/jobs/analyze', params)
}

export interface FetchJobUrlResult {
  title: string
  company: string
  description: string
  location?: string
  apply_url?: string
  source: string
}

export async function fetchJobUrl(url: string): Promise<FetchJobUrlResult> {
  return post('/api/jobs/fetch-url', { url })
}

// ---------------------------------------------------------------------------
// Tailor flow
// ---------------------------------------------------------------------------

export interface ScoreResult {
  score: ATSScore
}

export async function scoreResume(resumeId: string, jobId: string): Promise<ScoreResult> {
  return post('/api/tailor/score', { resumeId, jobId })
}

export interface TailorContextResult {
  baseResumeId: string
  source: string
  jobTitle?: string
  company?: string
  atsScore: number
  missingSkills: string[]
  githubRepoCount: number
  hasGitHubContext: boolean
  processLog?: TailorProcessLogEntry[]
}

export async function fetchTailorContext(jobId: string): Promise<TailorContextResult> {
  const res = await fetch(`/api/tailor/context?jobId=${encodeURIComponent(jobId)}`)
  const data = (await res.json().catch(() => ({}))) as TailorContextResult & { error?: string; processLog?: TailorProcessLogEntry[] }
  if (!res.ok) {
    throw new APIError(res.status, data.error ?? 'Could not load tailor context', {
      processLog: data.processLog,
    })
  }
  return data
}

export interface QuestionsResult {
  questions: GapQuestion[]
  gapAnalysis?: import('@/types').GapAnalysis
  baseResumeId?: string
  processLog?: TailorProcessLogEntry[]
  model?: string
  keySource?: string
}

export async function generateQuestions(resumeId: string, jobId: string): Promise<QuestionsResult> {
  return post('/api/tailor/questions', { resumeId, jobId }, { timeoutMs: 55_000 })
}

export interface TailorResult {
  tailoredResumeId: string
  tailoredData: StructuredResume
  originalData?: StructuredResume
  changes: ResumeDiffChange[]
  matchScore: number
  tailoredScore: number
  version?: number
  processLog?: TailorProcessLogEntry[]
  meta?: {
    passedGate?: boolean
    warning?: string
    aiCallsUsed?: number
    attempts?: number
  }
}

export async function tailorResume(params: {
  resumeId: string
  jobId: string
  answers: Record<string, string>
  questions?: { id: string; question: string }[]
  gapAnalysis?: import('@/types').GapAnalysis
  fastMode?: boolean
}): Promise<TailorResult> {
  return post('/api/tailor/generate', params, { timeoutMs: 125_000 })
}

/**
 * Streams the cover letter as plain text.
 * Pass an onChunk callback to update UI in real time.
 */
export async function generateCoverLetter(
  tailoredResumeId: string,
  onChunk: (text: string) => void
): Promise<string> {
  const res = await fetch('/api/tailor/cover-letter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tailoredResumeId }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }))
    throw new APIError(res.status, data.error ?? 'Failed to generate cover letter')
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    full += chunk
    onChunk(full)
  }

  return full
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportPDF(tailoredResumeId: string): Promise<Blob> {
  const res = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tailoredResumeId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText })) as {
      error?: string
      layoutIssues?: unknown
    }
    throw new APIError(res.status, data.error ?? 'Failed to export PDF', {
      layoutIssues: data.layoutIssues,
    })
  }
  return res.blob()
}

export async function exportDOCX(tailoredResumeId: string): Promise<Blob> {
  const res = await fetch('/api/export/docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tailoredResumeId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText })) as {
      error?: string
      layoutIssues?: unknown
    }
    throw new APIError(res.status, data.error ?? 'Failed to export DOCX', {
      layoutIssues: data.layoutIssues,
    })
  }
  return res.blob()
}

/** Triggers a file download in the browser from a Blob */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
