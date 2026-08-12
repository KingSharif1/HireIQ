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

export type FieldChoice = {
  value: string
  label: string
}

export type FieldDescriptor = {
  key: string
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  label: string
  required: boolean
  kind: FieldKind
  inputType: string
  value: string
  /** Closed choices for <select>, radio group, or combobox */
  choices?: FieldChoice[]
  choiceMode?: 'select' | 'radio' | 'combobox'
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
    if (el.getAttribute('aria-hidden') === 'true') return false
    // react-select required sentinel
    if (el instanceof HTMLInputElement && el.tabIndex < 0 && el.getAttribute('role') !== 'combobox') {
      return false
    }
    return true
  }) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
}

function isComboboxInput(el: Element): el is HTMLInputElement {
  return (
    el instanceof HTMLInputElement &&
    (el.getAttribute('role') === 'combobox' ||
      el.classList.contains('select__input') ||
      el.getAttribute('aria-autocomplete') === 'list')
  )
}

function openComboboxMenu(input: HTMLInputElement) {
  const control =
    (input.closest('.select__control') as HTMLElement | null) ||
    (input.closest('[class*="select__control"]') as HTMLElement | null) ||
    input
  const rect = control.getBoundingClientRect()
  const cx = rect.left + Math.max(rect.width / 2, 4)
  const cy = rect.top + Math.max(rect.height / 2, 4)
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'] as const) {
    control.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: cx,
        clientY: cy,
        view: window,
      }),
    )
  }
  input.focus()
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true }),
  )
}

function closeComboboxMenu(input: HTMLInputElement) {
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }),
  )
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }),
  )
}

function readOpenComboboxOptions(input: HTMLInputElement): FieldChoice[] {
  const menuId = input.getAttribute('aria-controls')
  const menu =
    (menuId ? document.getElementById(menuId) : null) ||
    input.closest('.select-shell')?.querySelector('.select__menu, [class*="select__menu"]') ||
    document.querySelector('.select__menu, [class*="MenuList"]')

  const optionEls = menu
    ? Array.from(menu.querySelectorAll('.select__option, [class*="select__option"], [role="option"]'))
    : Array.from(document.querySelectorAll(`[id^="react-select-${CSS.escape(input.id)}-option"], [role="option"]`))

  const seen = new Set<string>()
  const choices: FieldChoice[] = []
  for (const opt of optionEls) {
    const label = (opt.textContent || '').replace(/\s+/g, ' ').trim()
    if (!label || /^select(\s*\.{0,3}|(\s+one))?$/i.test(label)) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    choices.push({ value: label, label })
  }
  return choices
}

/** Open react-select / combobox, read options, close. */
export async function readComboboxChoices(
  input: HTMLInputElement,
  opts?: { maxChoices?: number },
): Promise<FieldChoice[]> {
  const maxChoices = opts?.maxChoices ?? 8
  openComboboxMenu(input)
  await sleep(220)
  for (let i = 0; i < 6; i++) {
    if (input.getAttribute('aria-expanded') === 'true' || readOpenComboboxOptions(input).length) break
    await sleep(80)
  }
  const choices = readOpenComboboxOptions(input)
  closeComboboxMenu(input)
  await sleep(80)
  if (choices.length < 2 || choices.length > maxChoices) return []
  return choices
}

/** Enrich descriptors that are comboboxes with closed choices when possible. */
export async function enrichComboboxChoices(descriptors: FieldDescriptor[]): Promise<void> {
  for (const d of descriptors) {
    if (d.choiceMode !== 'combobox') continue
    if (!(d.el instanceof HTMLInputElement)) continue
    try {
      const largeEnum =
        d.kind === 'country' || /\bcountry\b/i.test(d.label) || /\bnationality\b/i.test(d.label)
      const choices = await readComboboxChoices(d.el, { maxChoices: largeEnum ? 300 : 8 })
      if (choices.length >= 2) d.choices = choices
    } catch {
      /* leave without choices → text fallback */
    }
  }
}

/** Click a combobox option (react-select). */
export async function applyComboboxChoice(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  choice: FieldChoice,
): Promise<boolean> {
  if (!(el instanceof HTMLInputElement)) return false
  openComboboxMenu(el)
  await sleep(200)
  for (let i = 0; i < 6; i++) {
    if (el.getAttribute('aria-expanded') === 'true' || readOpenComboboxOptions(el).length) break
    await sleep(80)
  }
  const menuId = el.getAttribute('aria-controls')
  const menu =
    (menuId ? document.getElementById(menuId) : null) ||
    el.closest('.select-shell')?.querySelector('.select__menu, [class*="select__menu"]') ||
    document.querySelector('.select__menu')
  const options = menu
    ? Array.from(menu.querySelectorAll('.select__option, [class*="select__option"], [role="option"]'))
    : Array.from(document.querySelectorAll(`[id^="react-select-${CSS.escape(el.id)}-option"]`))

  const wanted = choice.label.replace(/\s+/g, ' ').trim().toLowerCase()
  const hit = options.find(o => (o.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === wanted)
  if (hit instanceof HTMLElement) {
    hit.click()
    highlightEl(el)
    await sleep(100)
    return true
  }
  closeComboboxMenu(el)
  return false
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

function selectChoices(el: HTMLSelectElement): FieldChoice[] {
  return Array.from(el.options)
    .filter(o => !o.disabled)
    .map(o => ({
      value: o.value,
      label: (o.label || o.textContent || o.value).replace(/\s+/g, ' ').trim(),
    }))
    .filter(c => c.label && !/^select(\s+one)?$/i.test(c.label) && c.value !== '')
}

function radioOptionLabel(el: HTMLInputElement): string {
  const wrap = el.closest('label')
  if (wrap) {
    const clone = wrap.cloneNode(true) as HTMLElement
    clone.querySelectorAll('input').forEach(n => n.remove())
    const t = (clone.textContent || '').replace(/\s+/g, ' ').trim()
    if (t && t.length < 80) return t
  }
  const next = el.nextSibling
  if (next && next.nodeType === Node.TEXT_NODE) {
    const t = (next.textContent || '').replace(/\s+/g, ' ').trim()
    if (t) return t
  }
  return el.value || 'Option'
}

function radioGroupChoices(name: string): {
  els: HTMLInputElement[]
  choices: FieldChoice[]
  label: string
  required: boolean
} {
  const els = Array.from(
    document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`),
  ).filter((el): el is HTMLInputElement => el instanceof HTMLInputElement)
  const choices = els.map(el => ({
    value: el.value,
    label: radioOptionLabel(el),
  }))
  const first = els[0]
  const groupLabel =
    (first &&
      (first.closest('fieldset')?.querySelector('legend')?.textContent ||
        first.getAttribute('aria-label') ||
        labelFor(first))) ||
    name
  return {
    els,
    choices,
    label: String(groupLabel).replace(/\s+/g, ' ').trim().slice(0, 200) || name,
    required: els.some(el => isRequired(el)),
  }
}

/** Apply a closed choice to select or radio group. */
export function applyChoiceToField(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  choice: FieldChoice,
  mode?: 'select' | 'radio',
) {
  if (mode === 'radio' || (el instanceof HTMLInputElement && el.type === 'radio')) {
    const name = el.name
    const radios = name
      ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`))
      : [el]
    for (const r of radios) {
      if (!(r instanceof HTMLInputElement)) continue
      const match =
        r.value === choice.value ||
        labelFor(r).replace(/\s+/g, ' ').trim().toLowerCase() ===
          choice.label.replace(/\s+/g, ' ').trim().toLowerCase()
      if (match) {
        r.checked = true
        r.dispatchEvent(new Event('input', { bubbles: true }))
        r.dispatchEvent(new Event('change', { bubbles: true }))
        r.click()
        highlightEl(r)
        return
      }
    }
    return
  }

  if (el instanceof HTMLSelectElement) {
    const opt =
      Array.from(el.options).find(o => o.value === choice.value) ||
      Array.from(el.options).find(
        o =>
          (o.label || o.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() ===
          choice.label.replace(/\s+/g, ' ').trim().toLowerCase(),
      )
    if (opt) {
      setNativeValue(el, opt.value)
      highlightEl(el)
    }
    return
  }

  setNativeValue(el, choice.label || choice.value)
  highlightEl(el)
}

export function collectFieldDescriptors(): FieldDescriptor[] {
  const out: FieldDescriptor[] = []
  const usedKeys = new Set<string>()
  const seenRadioNames = new Set<string>()
  let i = 0
  for (const el of collectControls()) {
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      const name = el.name || el.id
      if (!name || seenRadioNames.has(name)) continue
      seenRadioNames.add(name)
      const group = radioGroupChoices(name)
      if (group.choices.length < 2) continue
      let key = fieldKey(el, group.label, i++)
      if (usedKeys.has(key)) key = `${key}_${i}`
      usedKeys.add(key)
      const selected = group.els.find(r => r.checked)
      out.push({
        key,
        el: group.els[0]!,
        label: group.label.slice(0, 200),
        required: group.required,
        kind: 'unknown',
        inputType: 'radio',
        value: selected ? (selected.value || labelFor(selected)).trim() : '',
        choices: group.choices,
        choiceMode: 'radio',
      })
      continue
    }

    const meta = metaFor(el)
    const kind = classifyField(meta)
    if (kind === 'skip') continue
    let key = fieldKey(el, meta.label, i++)
    if (usedKeys.has(key)) key = `${key}_${i}`
    usedKeys.add(key)

    const choices = el instanceof HTMLSelectElement ? selectChoices(el) : undefined
    const combobox = isComboboxInput(el)
    let current = (el.value || '').trim()
    if (combobox && !current) {
      const shown = el
        .closest('.select__control, .select-shell')
        ?.querySelector('.select__single-value, [class*="singleValue"]')
      current = (shown?.textContent || '').replace(/\s+/g, ' ').trim()
    }
    out.push({
      key,
      el,
      label: meta.label.slice(0, 200),
      required: isRequired(el),
      kind,
      inputType: combobox ? 'combobox' : meta.type,
      value: current,
      ...(choices && choices.length >= 2
        ? { choices, choiceMode: 'select' as const }
        : combobox
          ? { choiceMode: 'combobox' as const }
          : {}),
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

    let current = (d.el.value || '').trim()
    if (!current && d.choiceMode === 'combobox') {
      const shown = d.el
        .closest('.select__control, .select-shell')
        ?.querySelector('.select__single-value, [class*="singleValue"]')
      current = (shown?.textContent || '').replace(/\s+/g, ' ').trim()
    }
    if (current) continue

    highlightEl(d.el)
    if (d.choiceMode === 'combobox') {
      // Prefer matching a real option (country lists, etc.)
      const largeEnum = d.kind === 'country' || /\bcountry\b/i.test(d.label)
      const choices = await readComboboxChoices(d.el as HTMLInputElement, {
        maxChoices: largeEnum ? 300 : 8,
      })
      const hit =
        choices.find(c => c.label.toLowerCase() === value.toLowerCase()) ||
        choices.find(c => c.label.toLowerCase().includes(value.toLowerCase())) ||
        choices.find(c => value.toLowerCase().includes(c.label.toLowerCase()))
      if (hit) {
        await applyComboboxChoice(d.el, hit)
      } else {
        setNativeValue(d.el, value)
      }
    } else if (d.choiceMode === 'select' && d.el instanceof HTMLSelectElement) {
      applyChoiceToField(d.el, { value, label: value }, 'select')
    } else {
      setNativeValue(d.el, value)
    }
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
    // Include known empty fields (no profile value) and unknowns
    return true
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
