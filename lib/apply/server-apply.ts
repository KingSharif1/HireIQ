import type { Locator, Page } from 'playwright'
import { getBoardAdapter, type BoardKind } from '@/lib/extension/board'
import {
  createInitialApplyProgress,
  patchApplyProgress,
  type ApplyIdentityPayload,
  type ApplyProgress,
  type ServerApplyContext,
} from '@/lib/apply/types'
import {
  isDismissLabel,
  isGateLabel,
  isSubmitLabel,
  MAX_CONTINUE_GATES,
  nextApplyAction,
  nextFillApproach,
} from '@/lib/apply/flow'

export type ServerApplyOutcome = {
  status: 'applied' | 'needs_user' | 'failed'
  error?: string
  filled: string[]
  notes: string[]
  finalUrl?: string
  submitted?: boolean
  progress: ApplyProgress
}

const IDENTITY_SELECTORS = [
  'input[type="email"]',
  'input[autocomplete="email"]',
  'input[autocomplete="given-name"]',
  'input[autocomplete="family-name"]',
  'input[name="first_name"]',
  'input[name="job_application[first_name]"]',
  'input[name="email"]',
  'input[type="tel"]',
]

const GATE_NAME =
  /^(Continue|Next|Apply now|Apply for this job|Apply|Start application|Get started|Continue as guest|Continue application)$/i

async function fillGently(loc: Locator, value: string): Promise<boolean> {
  const visible = await loc.isVisible().catch(() => false)
  const disabled = await loc.isDisabled().catch(() => true)
  let current = await loc.inputValue().catch(() => '')
  const tried: Array<'fill' | 'type'> = []

  for (;;) {
    const approach = nextFillApproach({
      visible,
      disabled,
      current,
      desired: value,
      tried,
    })
    if (approach === 'already_set') return true
    if (
      approach === 'skip_hidden' ||
      approach === 'skip_disabled' ||
      approach === 'skip_overwrite' ||
      approach === 'give_up'
    ) {
      return false
    }
    try {
      if (approach === 'fill') {
        tried.push('fill')
        await loc.fill(value, { timeout: 2500 })
      } else {
        tried.push('type')
        await loc.click({ timeout: 1500 })
        await loc.fill('', { timeout: 1500 }).catch(() => undefined)
        await loc.pressSequentially(value, { delay: 15, timeout: 4000 })
      }
      current = await loc.inputValue().catch(() => '')
      if (current.trim() === value.trim()) return true
    } catch {
      current = await loc.inputValue().catch(() => current)
    }
  }
}

async function fillFirst(
  page: Page,
  selectors: string[],
  value: string,
  label: string,
  filled: string[],
): Promise<boolean> {
  if (!value) return false
  for (const sel of selectors) {
    const loc = page.locator(sel).first()
    if ((await loc.count()) === 0) continue
    if (await fillGently(loc, value)) {
      if (!filled.includes(label)) filled.push(label)
      return true
    }
  }
  return false
}

async function clickFirst(page: Page, selectors: string[]): Promise<boolean> {
  for (const sel of selectors) {
    const loc = page.locator(sel).first()
    if ((await loc.count()) === 0) continue
    try {
      if (!(await loc.isVisible().catch(() => false))) continue
      await loc.click({ timeout: 3000 })
      return true
    } catch {
      // try next selector — don't force a dead control
    }
  }
  return false
}

async function countVisibleIdentityFields(page: Page): Promise<number> {
  let n = 0
  for (const sel of IDENTITY_SELECTORS) {
    const loc = page.locator(sel)
    const count = await loc.count()
    for (let i = 0; i < count; i++) {
      const item = loc.nth(i)
      if (await item.isVisible().catch(() => false)) n += 1
    }
  }
  return n
}

async function captchaPresent(page: Page): Promise<boolean> {
  return (await page.locator('iframe[src*="recaptcha"], .g-recaptcha, [data-callback*="captcha"]').count()) > 0
}

async function clickNamedGate(page: Page): Promise<string | null> {
  const roles = ['button', 'link'] as const
  for (const role of roles) {
    const named = page.getByRole(role, { name: GATE_NAME })
    const count = await named.count()
    for (let i = 0; i < Math.min(count, 8); i++) {
      const el = named.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      const text = (await el.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
      if (!text || isSubmitLabel(text) || !isGateLabel(text)) continue
      try {
        await el.click({ timeout: 3000 })
        return text
      } catch {
        // try next candidate
      }
    }
  }
  return null
}

async function clickDismiss(page: Page): Promise<boolean> {
  const named = page.getByRole('button', { name: /accept|agree|allow|got it/i })
  const count = await named.count()
  for (let i = 0; i < Math.min(count, 6); i++) {
    const el = named.nth(i)
    if (!(await el.isVisible().catch(() => false))) continue
    const text = (await el.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
    if (!isDismissLabel(text)) continue
    try {
      await el.click({ timeout: 2000 })
      return true
    } catch {
      // next
    }
  }
  return false
}

async function hasContinueControl(page: Page, continueSelectors: string[]): Promise<boolean> {
  if (await hasVisibleNamed(page, 'gate')) return true
  for (const sel of continueSelectors) {
    const loc = page.locator(sel).first()
    if ((await loc.count()) === 0) continue
    if (await loc.isVisible().catch(() => false)) return true
  }
  return false
}

async function hasVisibleNamed(page: Page, kind: 'gate' | 'dismiss'): Promise<boolean> {
  const named = page.getByRole('button', {
    name: kind === 'dismiss' ? /accept|agree|allow|got it/i : GATE_NAME,
  })
  const count = await named.count()
  for (let i = 0; i < Math.min(count, 8); i++) {
    const el = named.nth(i)
    if (!(await el.isVisible().catch(() => false))) continue
    const text = (await el.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
    if (kind === 'dismiss') return isDismissLabel(text)
    if (isGateLabel(text) && !isSubmitLabel(text)) return true
  }
  const links = page.getByRole('link', { name: GATE_NAME })
  if (kind === 'gate' && (await links.count()) > 0) {
    const first = links.first()
    if (await first.isVisible().catch(() => false)) {
      const text = (await first.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
      return isGateLabel(text) && !isSubmitLabel(text)
    }
  }
  return false
}

function fieldSelectors(board: BoardKind, kind: string): string[] {
  const adapter = getBoardAdapter(
    board === 'greenhouse'
      ? 'job-boards.greenhouse.io'
      : board === 'lever'
        ? 'jobs.lever.co'
        : board === 'ashby'
          ? 'jobs.ashbyhq.com'
          : board === 'workday'
            ? 'myworkdayjobs.com'
            : 'example.com',
  )

  const byKind: Record<string, string[]> = {
    first_name: [
      'input[name="job_application[first_name]"]',
      'input[name="first_name"]',
      'input[autocomplete="given-name"]',
      'input[name*="first" i][name*="name" i]',
      'input[id*="first" i][id*="name" i]',
    ],
    last_name: [
      'input[name="job_application[last_name]"]',
      'input[name="last_name"]',
      'input[autocomplete="family-name"]',
      'input[name*="last" i][name*="name" i]',
      'input[id*="last" i][id*="name" i]',
    ],
    email: [
      'input[type="email"]',
      'input[name="job_application[email]"]',
      'input[name="email"]',
      'input[name="emails"]',
      'input[autocomplete="email"]',
      'input[name*="email" i]',
    ],
    phone: [
      'input[type="tel"]',
      'input[name="job_application[phone]"]',
      'input[name="phone"]',
      'input[name="phones"]',
      'input[autocomplete="tel"]',
      'input[name*="phone" i]',
    ],
    linkedin: [
      'input[name="urls[LinkedIn]"]',
      'input[name*="linkedin" i]',
      'input[id*="linkedin" i]',
    ],
    website: [
      'input[name="urls[Portfolio]"]',
      'input[name="urls[GitHub]"]',
      'input[name*="website" i]',
      'input[name*="portfolio" i]',
    ],
    full_name: ['input[name="name"]', 'input[autocomplete="name"]', 'input[name*="full" i][name*="name" i]'],
  }

  void adapter
  return byKind[kind] ?? []
}

async function fillIdentity(
  page: Page,
  identity: ApplyIdentityPayload,
  board: BoardKind,
  onField?: (filled: string[]) => void | Promise<void>,
) {
  const filled: string[] = []
  const fullName = [identity.firstName, identity.lastName].filter(Boolean).join(' ')

  if (board === 'lever' || board === 'ashby') {
    await fillFirst(page, fieldSelectors(board, 'full_name'), fullName, 'full_name', filled)
    await onField?.(filled)
  }
  await fillFirst(page, fieldSelectors(board, 'first_name'), identity.firstName, 'first_name', filled)
  await onField?.(filled)
  await fillFirst(page, fieldSelectors(board, 'last_name'), identity.lastName, 'last_name', filled)
  await onField?.(filled)
  await fillFirst(page, fieldSelectors(board, 'email'), identity.email, 'email', filled)
  await onField?.(filled)
  await fillFirst(page, fieldSelectors(board, 'phone'), identity.phone, 'phone', filled)
  await onField?.(filled)
  await fillFirst(page, fieldSelectors(board, 'linkedin'), identity.linkedin, 'linkedin', filled)
  await onField?.(filled)
  await fillFirst(page, fieldSelectors(board, 'website'), identity.website, 'website', filled)
  await onField?.(filled)
  return filled
}

async function maybeAttachResume(page: Page, board: BoardKind, pdfUrl: string | null, notes: string[]) {
  if (!pdfUrl) {
    notes.push('No tailored PDF on file — resume upload skipped')
    return false
  }
  const adapter = getBoardAdapter(
    board === 'greenhouse' ? 'job-boards.greenhouse.io' : 'example.com',
  )
  const selectors = [...adapter.resumeInputSelectors, 'input[type="file"]']
  for (const sel of selectors) {
    const input = page.locator(sel).first()
    if ((await input.count()) === 0) continue
    try {
      const res = await fetch(pdfUrl)
      if (!res.ok) {
        notes.push(`Resume download failed (${res.status})`)
        return false
      }
      const buf = Buffer.from(await res.arrayBuffer())
      await input.setInputFiles({
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: buf,
      })
      notes.push('Attached tailored resume PDF')
      return true
    } catch (err) {
      notes.push(`Resume attach failed: ${err instanceof Error ? err.message : 'error'}`)
      return false
    }
  }
  notes.push('No resume file input found')
  return false
}

/**
 * Playwright server apply for one run context.
 * Default is fill-only (no Submit) unless ctx.submit is true.
 */
export async function runServerApply(ctx: ServerApplyContext): Promise<ServerApplyOutcome> {
  const notes: string[] = []
  let progress = createInitialApplyProgress()
  const report = async (next: ApplyProgress) => {
    progress = next
    await ctx.onProgress?.(progress)
  }

  const { chromium } = await import('playwright')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    await report(
      patchApplyProgress(progress, {
        currentStep: 'open',
        stepState: 'active',
        detail: 'Launching browser…',
      })
    )

    const page = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 },
    })

    await page.goto(ctx.applyUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForTimeout(1500)

    if (!ctx.identity.email) {
      progress = patchApplyProgress(progress, {
        currentStep: 'done',
        stepState: 'blocked',
        detail: 'Missing apply email',
        percent: 100,
      })
      await report(progress)
      return {
        status: 'failed',
        error: 'No apply email on profile — set Application email or connect Gmail',
        filled: [],
        notes,
        finalUrl: page.url(),
        progress,
      }
    }

    await report(
      patchApplyProgress(progress, {
        currentStep: 'form',
        stepState: 'active',
        detail: 'Walking Continue screens — fields often come after a few pages',
      })
    )

    const adapter = getBoardAdapter(new URL(ctx.applyUrl).hostname)
    let gatesClicked = 0
    let reachedForm = false

    for (let step = 0; step < MAX_CONTINUE_GATES + 2; step++) {
      const action = nextApplyAction({
        visibleIdentityFields: await countVisibleIdentityFields(page),
        hasContinue: await hasContinueControl(page, adapter.continueSelectors),
        hasDismiss: await hasVisibleNamed(page, 'dismiss'),
        hasCaptcha: await captchaPresent(page),
        gatesClicked,
      })

      if (action === 'wait_captcha') {
        notes.push('CAPTCHA detected')
        progress = patchApplyProgress(progress, {
          currentStep: 'form',
          stepState: 'blocked',
          detail: 'CAPTCHA — needs you',
          notes,
          percent: 35,
        })
        await report(progress)
        return {
          status: 'needs_user',
          error: 'CAPTCHA on this page — finish in your browser or retry later',
          filled: [],
          notes,
          finalUrl: page.url(),
          progress,
        }
      }

      if (action === 'fill') {
        reachedForm = true
        break
      }

      if (action === 'dismiss') {
        if (await clickDismiss(page)) {
          notes.push('Dismissed cookie / consent banner')
          await page.waitForTimeout(800)
          continue
        }
      }

      if (action === 'continue' || action === 'dismiss') {
        let clicked = await clickNamedGate(page)
        if (!clicked && adapter.continueSelectors.length) {
          const ok = await clickFirst(page, adapter.continueSelectors)
          if (ok) clicked = 'Continue'
        }
        if (!clicked) break
        gatesClicked += 1
        notes.push(`Clicked “${clicked}” (${gatesClicked}/${MAX_CONTINUE_GATES})`)
        await report(
          patchApplyProgress(progress, {
            currentStep: 'form',
            stepState: 'active',
            notes: [...notes],
            detail: `Continue ${gatesClicked}/${MAX_CONTINUE_GATES} — not filling until fields appear`,
            percent: 18 + gatesClicked * 4,
          })
        )
        await page.waitForTimeout(1400)
        await page.waitForLoadState('domcontentloaded').catch(() => undefined)
        continue
      }

      break
    }

    if (!reachedForm) {
      notes.push('No identity fields after Continue screens — not forcing a fill')
      progress = patchApplyProgress(progress, {
        currentStep: 'form',
        stepState: 'blocked',
        notes: [...notes],
        detail: 'Still on intro pages. Needs you — we did not force-fill.',
        percent: 40,
      })
      await report(progress)
      return {
        status: 'needs_user',
        error:
          'This application still has intro / Continue screens (or no form yet). We did not force any fields. Open the page and continue, or retry.',
        filled: [],
        notes,
        finalUrl: page.url(),
        progress,
      }
    }

    await report(
      patchApplyProgress(progress, {
        currentStep: 'identity',
        stepState: 'active',
        notes: [...notes],
        detail: 'Form is on screen — filling visible fields only',
      })
    )

    const filled = await fillIdentity(page, ctx.identity, ctx.board, async nextFilled => {
      await report(
        patchApplyProgress(progress, {
          currentStep: 'identity',
          stepState: 'active',
          filled: [...nextFilled],
          detail: nextFilled.length
            ? `Filled ${nextFilled.join(', ')}`
            : 'Looking for fields…',
          percent: 30 + Math.min(40, nextFilled.length * 7),
        })
      )
    })

    await report(
      patchApplyProgress(progress, {
        currentStep: 'resume',
        stepState: 'active',
        filled,
        detail: ctx.resumePdfUrl ? 'Attaching tailored PDF…' : 'No PDF — skipping upload',
      })
    )

    const attached = await maybeAttachResume(page, ctx.board, ctx.resumePdfUrl, notes)
    if (attached) filled.push('resume')

    await report(
      patchApplyProgress(progress, {
        currentStep: 'resume',
        stepState: attached ? 'done' : 'skipped',
        filled,
        notes: [...notes],
        detail: attached ? 'Resume attached' : notes[notes.length - 1],
      })
    )

    if (filled.length === 0) {
      progress = patchApplyProgress(progress, {
        currentStep: 'identity',
        stepState: 'blocked',
        filled,
        notes: [...notes],
        detail: 'No fillable fields found',
        percent: 50,
      })
      await report(progress)
      return {
        status: 'needs_user',
        error: 'Could not find fillable application fields on this page',
        filled,
        notes,
        finalUrl: page.url(),
        progress,
      }
    }

    let submitted = false
    if (ctx.submit) {
      await report(
        patchApplyProgress(progress, {
          currentStep: 'submit',
          stepState: 'active',
          filled,
          notes: [...notes],
          detail: 'Clicking Submit…',
        })
      )
      submitted = await clickFirst(page, [
        ...adapter.submitSelectors,
        'button[type="submit"]',
        'input[type="submit"]',
      ])
      if (submitted) {
        notes.push('Clicked submit')
        await page.waitForTimeout(2000)
      } else {
        notes.push('Submit control not found')
        progress = patchApplyProgress(progress, {
          currentStep: 'submit',
          stepState: 'blocked',
          filled,
          notes: [...notes],
          detail: 'Could not find Submit',
        })
        await report(progress)
        return {
          status: 'needs_user',
          error: 'Filled the form but could not find Submit',
          filled,
          notes,
          finalUrl: page.url(),
          progress,
        }
      }
    } else {
      notes.push('Dry run — Submit not clicked (pass submit:true to submit)')
      await report(
        patchApplyProgress(progress, {
          currentStep: 'submit',
          stepState: 'skipped',
          filled,
          notes: [...notes],
          detail: 'Paused for your review (dry run)',
        })
      )
    }

    progress = patchApplyProgress(progress, {
      currentStep: 'done',
      stepState: 'done',
      filled,
      notes: [...notes],
      detail: submitted ? 'Submitted' : 'Ready for your review',
      percent: 100,
    })
    await report(progress)

    return {
      status: submitted ? 'applied' : 'needs_user',
      filled,
      notes,
      finalUrl: page.url(),
      submitted,
      progress,
      error: submitted
        ? undefined
        : 'Form filled. Review on the employer site, or re-queue with submit enabled.',
    }
  } catch (err) {
    notes.push(err instanceof Error ? err.message : 'Playwright apply failed')
    progress = patchApplyProgress(progress, {
      currentStep: progress.currentStep,
      stepState: 'blocked',
      notes: [...notes],
      detail: err instanceof Error ? err.message : 'Failed',
      markPreviousDone: false,
    })
    await report(progress).catch(() => undefined)
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : 'Playwright apply failed',
      filled: progress.filled,
      notes,
      progress,
    }
  } finally {
    await browser.close()
  }
}
