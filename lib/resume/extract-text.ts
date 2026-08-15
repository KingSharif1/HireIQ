import type { AiRuntime } from '@/lib/ai/runtime'

export const MAX_RESUME_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_RESUME_UPLOAD_LABEL = '10MB'

export type ExtractedResumeText = {
  text: string
  /** How text was obtained — text layer vs Claude reading the PDF pages. */
  source: 'pdf-text' | 'docx-text' | 'pdf-vision'
}

/** Prefer embedded text; fall back to empty so callers can trigger vision OCR. */
export async function extractResumeTextLayer(
  buffer: Buffer,
  fileType: 'pdf' | 'docx'
): Promise<ExtractedResumeText> {
  if (fileType === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return { text: (result.value ?? '').trim(), source: 'docx-text' }
  }

  try {
    const { PDFParse } = require('pdf-parse') as {
      PDFParse: new (opts: { data: Buffer }) => {
        getText: () => Promise<{ text?: string }>
        destroy: () => Promise<void>
      }
    }
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return { text: (result.text ?? '').trim(), source: 'pdf-text' }
    } finally {
      await parser.destroy().catch(() => undefined)
    }
  } catch {
    return { text: '', source: 'pdf-text' }
  }
}

export function needsVisionOcr(text: string, fileType: 'pdf' | 'docx'): boolean {
  if (fileType !== 'pdf') return false
  return text.replace(/\s+/g, ' ').trim().length < 50
}
