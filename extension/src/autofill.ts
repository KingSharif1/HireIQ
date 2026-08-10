import {
  classifyField,
  valueForKind,
  isSensitiveFieldLabel,
  type AutofillProfile,
  type FieldKind,
} from '@hireiq/form-fill'
import {
  attachFileToInput as attachFileToInputImpl,
  findCoverFileInput as findCoverFileInputImpl,
  findResumeFileInput as findResumeFileInputImpl,
} from './file-attach'

export type FillItem = {
  kind: FieldKind
  label: string
  required: boolean
  filled: boolean
  value: string
}

export type FillReport = {
  items: FillItem[]
  filledCount: number
  fillableCount: number
  requiredFilled: number
  requiredTotal: number
}

export type FieldDescriptor = {
  key: string
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  label: string
  required: boolean
  kind: FieldKind
  inputType: string
  value: string
}

const HIGHLIGHT_MS = 650
const FILL_DELAY_MS = 180
const PROVISIONAL_COLOR = '#9ca3af'
const STYLE_ID = 'hireiq-autofill-styles'

function ensurePageStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    [data-hiq-state="provisional"] {
      color: ${PROVISIONAL_COLOR} !important;
      outline: 2px dashed #f59e0b !important;
      outline-offset: 2px;
    }
    [data-hiq-state="accepted"] {
      outline: 2px solid #10b981 !important;
      outline-offset: 2px;
      transition: outline-color 0.4s ease;
    }
    .hiq-flash-green {
      outline: 2px solid #10b981 !important;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
      transition: box-shadow 0.35s ease, outline-color 0.35s ease;
    }
  `
  ;(document.head || document.documentElement).appendChild(style)
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function labelFor(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  if (el.labels && el.labels[0]) return el.labels[0].innerText.replace(/\s+/g, ' ').trim()
  const aria = el.getAttribute('aria-label')
  if (aria) return aria.trim()
  const ph = el.getAttribute('placeholder')
  if (ph) return ph.trim()
  return el.name || el.id || el.type || 'field'
}

function isRequired(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  if (el.required) return true
  const label = labelFor(el)
  return /\*\s*$/.test(label) || /\brequired\b/i.test(label)
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype
  const desc = Object.getOwnPropertyDescriptor(proto, 'value')
  desc?.set?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
}

function collectControls(): Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  return Array.from(document.querySelectorAll('input, textarea, select')).filter(el => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
      return false
    }
    if (el instanceof HTMLInputElement && el.type === 'hidden') return false
    return true
  }) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
}

function fieldKey(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, label: string, index: number): string {
  const raw = el.name || el.id || label || `field_${index}`
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80) || `field_${index}`
}

function metaFor(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  return {
    name: el.name || '',
    id: el.id || '',
    type: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
    label: labelFor(el),
    placeholder: el.getAttribute('placeholder') || '',
    autocomplete: el.getAttribute('autocomplete') || '',
  }
}

/** Brief green flash + scroll into view. */
export function highlightEl(el: Element) {
  ensurePageStyles()
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    el.classList.add('hiq-flash-green')
    window.setTimeout(() => el.classList.remove('hiq-flash-green'), HIGHLIGHT_MS)
  }
}

export function collectFieldDescriptors(): FieldDescriptor[] {
  const out: FieldDescriptor[] = []
  const usedKeys = new Set<string>()
  let i = 0
  for (const el of collectControls()) {
    const meta = metaFor(el)
    const kind = classifyField(meta)
    if (kind === 'skip') continue
    let key = fieldKey(el, meta.label, i++)
    if (usedKeys.has(key)) key = `${key}_${i}`
    usedKeys.add(key)
    out.push({
      key,
      el,
      label: meta.label.slice(0, 200),
      required: isRequired(el),
      kind,
      inputType: meta.type,
      value: (el.value || '').trim(),
    })
  }
  return out
}

function buildReport(profile: AutofillProfile): FillReport {
  const items: FillItem[] = []
  let filledCount = 0
  let fillableCount = 0
  let requiredFilled = 0
  let requiredTotal = 0

  for (const d of collectFieldDescriptors()) {
    const value = valueForKind(d.kind, profile)
    const fillable = d.kind !== 'unknown' && Boolean(value)
    if (fillable) fillableCount += 1
    if (d.required) requiredTotal += 1
    const filled = Boolean(d.value)
    if (filled) {
      filledCount += 1
      if (d.required) requiredFilled += 1
    }
    if (d.kind !== 'unknown' || d.required) {
      items.push({
        kind: d.kind,
        label: d.label.slice(0, 80),
        required: d.required,
        filled,
        value: filled ? d.value.slice(0, 60) : '',
      })
    }
  }
  return { items, filledCount, fillableCount, requiredFilled, requiredTotal }
}

/** Fill known profile fields one-by-one with scroll + green highlight. */
export async function autofillKnownAnimated(
  profile: AutofillProfile,
  opts?: { delayMs?: number; onField?: (label: string) => void },
): Promise<FillReport> {
  ensurePageStyles()
  const delay = opts?.delayMs ?? FILL_DELAY_MS
  const descriptors = collectFieldDescriptors()

  for (const d of descriptors) {
    if (d.kind === 'unknown' || d.kind === 'skip') continue
    const value = valueForKind(d.kind, profile)
    if (!value) continue
    const current = (d.el.value || '').trim()
    if (current) continue // leave user edits

    highlightEl(d.el)
    setNativeValue(d.el, value)
    opts?.onField?.(d.label)
    await sleep(delay)
  }

  return buildReport(profile)
}

/** Sync fill (legacy) — no animation. */
export function autofillPage(profile: AutofillProfile): FillReport {
  for (const d of collectFieldDescriptors()) {
    if (d.kind === 'unknown' || d.kind === 'skip') continue
    const value = valueForKind(d.kind, profile)
    if (!value) continue
    if ((d.el.value || '').trim()) continue
    setNativeValue(d.el, value)
  }
  return buildReport(profile)
}

export function scanFormProgress(profile: AutofillProfile | null): FillReport {
  if (!profile) {
    return { items: [], filledCount: 0, fillableCount: 0, requiredFilled: 0, requiredTotal: 0 }
  }
  return buildReport(profile)
}

/** Empty fields that need a draft or manual answer (excludes file/password/skip). */
export function collectDraftCandidates(): FieldDescriptor[] {
  return collectFieldDescriptors().filter(d => {
    if (d.kind === 'skip') return false
    if (d.value) return false
    const type = d.inputType.toLowerCase()
    if (type === 'file' || type === 'password' || type === 'hidden') return false
    // Known kinds with a profile value are filled by autofillKnownAnimated — if still empty, no profile value
    if (d.kind !== 'unknown' && d.kind !== 'skip') {
      // still include so AI/user can fill country etc. when profile blank
      return true
    }
    return d.kind === 'unknown'
  })
}

/** @deprecated use collectDraftCandidates */
export function collectUnknownEmptyFields(): FieldDescriptor[] {
  return collectDraftCandidates().filter(d => d.kind === 'unknown' && !isSensitiveFieldLabel(d.label))
}

/** Pre-fill AI draft as provisional (muted gray + dashed amber). */
export function applyProvisional(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  ensurePageStyles()
  setNativeValue(el, value)
  el.setAttribute('data-hiq-state', 'provisional')
  el.style.color = PROVISIONAL_COLOR
}

/** Accept provisional → normal text + green flash. */
export function acceptProvisional(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value?: string,
) {
  ensurePageStyles()
  if (typeof value === 'string') setNativeValue(el, value)
  el.setAttribute('data-hiq-state', 'accepted')
  el.style.color = ''
  highlightEl(el)
  window.setTimeout(() => {
    if (el.getAttribute('data-hiq-state') === 'accepted') {
      el.style.outline = ''
    }
  }, 1200)
}

/** Skip: clear provisional value from the field. */
export function clearProvisional(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  if (el.getAttribute('data-hiq-state') === 'provisional') {
    setNativeValue(el, '')
  }
  el.removeAttribute('data-hiq-state')
  el.style.color = ''
  el.style.outline = ''
}

export function findResumeFileInput(): HTMLInputElement | null {
  return findResumeFileInputImpl()
}

export function findCoverFileInput(): HTMLInputElement | null {
  return findCoverFileInputImpl()
}

export function attachFileToInput(input: HTMLInputElement, file: File): boolean {
  return attachFileToInputImpl(input, file)
}

export { isSensitiveFieldLabel }
