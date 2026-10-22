import React from 'react'
import { DEFAULT_RESUME_THEME, mergeResumeTheme, type ResumeTheme } from '@/lib/export/theme'
import type { StructuredResume } from '@/types'

/** Page count of a PDF buffer (counts /Type /Page objects, not /Pages). */
export function pdfPageCount(buf: Buffer): number {
  return (buf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length
}

/** Slightly tighter variants, tried in order when the resume spills a little onto page 2. */
const FIT_STEPS: Array<Partial<ResumeTheme>> = [
  { lineHeight: 1.3, listLineHeight: 1.3 },
  { lineHeight: 1.25, listLineHeight: 1.25, marginY: 0.42 },
  { lineHeight: 1.22, listLineHeight: 1.22, marginY: 0.4, bodyFontSize: 9.5 },
]

/**
 * Render the resume PDF. If it runs just past one page, tighten spacing a step
 * at a time (never below 9.5pt text) so a lone section does not sit on page 2.
 * A resume that is genuinely two pages keeps its normal spacing.
 */
export async function renderResumePdfFitted(data: StructuredResume, theme?: ResumeTheme): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { ResumePDF } = await import('@/lib/export/pdf-generator')
  const base = theme ?? DEFAULT_RESUME_THEME
  const render = (t: ResumeTheme) => renderToBuffer(React.createElement(ResumePDF, { data, theme: t }) as any)

  const first = await render(base)
  if (pdfPageCount(first) <= 1) return first

  for (const step of FIT_STEPS) {
    const tighter = mergeResumeTheme(base, step)
    const buf = await render(tighter)
    if (pdfPageCount(buf) <= 1) return buf
  }
  return first
}
