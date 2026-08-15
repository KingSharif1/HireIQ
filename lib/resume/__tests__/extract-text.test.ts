import { describe, expect, it } from 'vitest'
import { needsVisionOcr, MAX_RESUME_UPLOAD_BYTES } from '@/lib/resume/extract-text'

describe('resume extract helpers', () => {
  it('caps uploads at 10MB', () => {
    expect(MAX_RESUME_UPLOAD_BYTES).toBe(10 * 1024 * 1024)
  })

  it('triggers vision OCR only for thin PDF text layers', () => {
    expect(needsVisionOcr('', 'pdf')).toBe(true)
    expect(needsVisionOcr('short', 'pdf')).toBe(true)
    expect(needsVisionOcr('x'.repeat(80), 'pdf')).toBe(false)
    expect(needsVisionOcr('', 'docx')).toBe(false)
  })
})
