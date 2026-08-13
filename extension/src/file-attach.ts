/** Find resume / cover file inputs and attach a File via DataTransfer. */

import { distinctiveResumeSelectors } from '../../lib/extension/board'

function labelBlob(el: HTMLInputElement): string {
  const parts: string[] = [el.name || '', el.id || '', el.getAttribute('aria-label') || '']
  if (el.labels) {
    Array.from(el.labels).forEach(lab => parts.push(lab.innerText || ''))
  }
  // nearby text
  const parent = el.closest('div, label, fieldset, li, td')
  if (parent) parts.push(parent.textContent || '')
  return parts.join(' ').toLowerCase().replace(/\s+/g, ' ')
}

function fileInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll('input[type="file"]')).filter(
    (el): el is HTMLInputElement => el instanceof HTMLInputElement,
  )
}

export function findResumeFileInput(): HTMLInputElement | null {
  for (const sel of distinctiveResumeSelectors()) {
    const el = document.querySelector(sel)
    if (el instanceof HTMLInputElement && el.type === 'file') return el
  }
  const inputs = fileInputs()
  const resume = inputs.find(el => {
    const blob = labelBlob(el)
    return /\b(resume|cv|curriculum)\b/.test(blob) && !/\bcover\b/.test(blob)
  })
  if (resume) return resume
  // single file input often means resume
  if (inputs.length === 1) return inputs[0]
  return inputs.find(el => !/\bcover\b/.test(labelBlob(el))) || null
}

export function findCoverFileInput(): HTMLInputElement | null {
  return (
    fileInputs().find(el => {
      const blob = labelBlob(el)
      return /\bcover\s*(letter)?\b/.test(blob)
    }) || null
  )
}

/** Attach a File to a file input (DataTransfer). Returns false if browser blocked it. */
export function attachFileToInput(input: HTMLInputElement, file: File): boolean {
  try {
    const dt = new DataTransfer()
    dt.items.add(file)
    input.files = dt.files
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    return (input.files?.length ?? 0) > 0
  } catch {
    return false
  }
}
