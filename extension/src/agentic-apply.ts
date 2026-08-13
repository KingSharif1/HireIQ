import type { ApplyIdentity } from '../../lib/extension/apply-identity'
import { findContinueButton, clickContinueButton } from '../../lib/extension/agentic-nav'
import {
  fillSignupForm,
  fillVerificationCode,
  generatePortalPassword,
} from '../../lib/extension/agentic-signup'
import { detectAuthWall } from './detect-auth-wall'

export type AgenticApplyContext = {
  applyIdentity: ApplyIdentity
  firstName: string
  lastName: string
  sleep: (ms: number) => Promise<void>
  fetchVerificationCode: (jobId: string) => Promise<{ code: string | null; error?: string }>
  savePortalCredentials: (jobId: string, email: string, password: string, note: string) => Promise<void>
  onStatus: (message: string, kind?: 'ok' | 'err') => void
}

export async function runContinueToApplication(ctx: AgenticApplyContext): Promise<boolean> {
  const found = findContinueButton(document)
  if (!found) {
    ctx.onStatus('No Continue / Next button found on this page.', 'err')
    return false
  }
  clickContinueButton(found)
  ctx.onStatus(`Clicked “${found.label}”. Waiting for the next step…`)
  await ctx.sleep(1500)
  return true
}

export async function runAgenticAccountCreation(
  ctx: AgenticApplyContext,
  jobId: string,
): Promise<boolean> {
  const wall = detectAuthWall(document)
  if (!wall.needsAccount) {
    ctx.onStatus('No signup wall detected on this page.', 'err')
    return false
  }

  if (!ctx.applyIdentity.canCreateAccount || !ctx.applyIdentity.applyEmail) {
    ctx.onStatus(ctx.applyIdentity.panelBody, 'err')
    return false
  }

  const password = generatePortalPassword()
  const filled = fillSignupForm(document, {
    email: ctx.applyIdentity.applyEmail,
    firstName: ctx.firstName,
    lastName: ctx.lastName,
    password,
  })

  if (!filled.includes('email')) {
    ctx.onStatus('Could not find email field on this signup form.', 'err')
    return false
  }

  ctx.onStatus(`Filled signup with ${ctx.applyIdentity.applyEmail}. Submit the form or we will try Continue…`)

  await ctx.savePortalCredentials(
    jobId,
    ctx.applyIdentity.applyEmail,
    password,
    `agentic:${wall.kind}`,
  )

  const submit = findContinueButton(document) ||
    (document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement | null)
  if (submit) {
    submit.click()
    await ctx.sleep(2000)
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const codeResult = await ctx.fetchVerificationCode(jobId)
    if (codeResult.code) {
      const entered = fillVerificationCode(document, codeResult.code)
      if (entered) {
        ctx.onStatus(`Entered verification code from ${ctx.applyIdentity.mode} inbox.`, 'ok')
        const verifySubmit =
          findContinueButton(document) ||
          (document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement | null)
        verifySubmit?.click()
        await ctx.sleep(1500)
        return true
      }
    }
    await ctx.sleep(3000)
  }

  ctx.onStatus('Account fields saved. Verification code not found yet — check your inbox or timeline.', 'err')
  return false
}

export async function runAgenticApplyStep(
  ctx: AgenticApplyContext,
  jobId: string,
): Promise<'continue' | 'signup' | 'noop'> {
  const wall = detectAuthWall(document)
  if (wall.needsAccount && ctx.applyIdentity.canCreateAccount) {
    await runAgenticAccountCreation(ctx, jobId)
    return 'signup'
  }
  if (findContinueButton(document)) {
    await runContinueToApplication(ctx)
    return 'continue'
  }
  return 'noop'
}
