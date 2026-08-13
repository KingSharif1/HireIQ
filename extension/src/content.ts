import { detectJobPage } from './detect'
import { scrapeJobFromDocument } from './scrape'
import { getSettings } from './settings'
import {
  autofillKnownAnimated,
  scanFormProgress,
  collectDraftCandidates,
  applyProvisional,
  acceptProvisional,
  clearProvisional,
  applyChoiceToField,
  applyComboboxChoice,
  enrichComboboxChoices,
  highlightEl,
  findResumeFileInput,
  findCoverFileInput,
  attachFileToInput,
  type FieldDescriptor,
  type FieldChoice,
  type FillReport,
} from './autofill'
import { extensionFetch, getExtensionBearer, base64ToFile, friendlyExtensionError } from './api'
import {
  runAgenticApplyStep,
  type AgenticApplyContext,
} from './agentic-apply'
import type { ApplyIdentity } from '../../lib/extension/apply-identity'
import { detectAuthWall } from './detect-auth-wall'
import { isSensitiveFieldLabel, type AutofillProfile, isMissingProfileValue, missingProfilePrompt, isMasterBackfillKind } from '@hireiq/form-fill'
import {
  AUTO_NA_ANSWER,
  isFollowUpQuestionLabel,
  isNegativeChoice,
} from '@hireiq/review-choices'
import { matchChoiceLabel } from '@hireiq/location-country'
import {
  clickSubmitButton,
  findSubmitButton,
  isSubmitAutomationBlocked,
} from './submit'

const ROOT_ID = 'hireiq-panel-root'

type DraftAnswer = {
  key: string
  answer: string
  lasting?: boolean
  skip?: boolean
  skipReason?: string
}

type ReviewItem = {
  key: string
  label: string
  answer: string
  lasting: boolean
  el: FieldDescriptor['el']
  status: 'pending' | 'accepted' | 'skipped'
  askPromote: boolean
  /** Sensitive / no AI — user must type */
  manual?: boolean
  /** Empty on master profile — offer save to master after accept */
  missingProfile?: boolean
  placeholder?: string
  choices?: FieldChoice[]
  choiceMode?: 'select' | 'radio' | 'combobox'
}

type ResumeOption = {
  id: string
  label: string
  updatedAt?: string | null
  hasCoverLetter?: boolean
}

type Preview = {
  fullName: string
  headline: string
  email: string
  phone: string
  location: string
  linkedin: string
  website: string
  experience: { title: string; company: string }[]
  education: { school: string; degree: string }[]
  skills: string[]
}

function scrape() {
  return scrapeJobFromDocument(document)
}

function removeUi() {
  document.getElementById(ROOT_ID)?.remove()
}

function pct(filled: number, total: number) {
  if (total <= 0) return 0
  return Math.round((filled / total) * 100)
}

function renderChecklist(report: FillReport): string {
  if (!report.items.length) {
    return `<div class="muted">No form fields detected yet — scroll to the application form.</div>`
  }
  const rows = report.items
    .slice(0, 12)
    .map(item => {
      const mark = item.filled ? '✓' : '○'
      const cls = item.filled ? 'ok' : item.required ? 'need' : 'opt'
      return `<div class="check ${cls}"><span>${mark}</span><span>${escapeHtml(item.label)}</span></div>`
    })
    .join('')
  return rows
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pageKindLabel(pageKind: 'posting' | 'apply' | 'unknown'): string {
  if (pageKind === 'apply') return 'Apply page'
  if (pageKind === 'posting') return 'Job posting'
  return ''
}

function ensureUi() {
  if (document.getElementById(ROOT_ID)) return

  const root = document.createElement('div')
  root.id = ROOT_ID
  root.attachShadow({ mode: 'open' })
  const shadow = root.shadowRoot!

  const scraped = scrape()
  const detect = detectJobPage(location.href, document)
  const kindHint = pageKindLabel(detect.pageKind)

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .dock {
        position: fixed;
        z-index: 2147483646;
        top: 0;
        right: 0;
        height: 100vh;
        width: min(360px, 92vw);
        font-family: "Segoe UI", ui-sans-serif, system-ui, sans-serif;
        color: #0f172a;
        pointer-events: none;
      }
      .panel {
        pointer-events: auto;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #fff;
        border-left: 1px solid #e2e8f0;
        box-shadow: -8px 0 32px rgba(15, 23, 42, 0.12);
      }
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      .brand {
        font-weight: 700;
        font-size: 14px;
        letter-spacing: -0.02em;
      }
      .brand span { color: #0d9488; }
      .iconbtn {
        appearance: none;
        border: 0;
        background: #f1f5f9;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 15px;
        line-height: 1;
      }
      .body {
        flex: 1;
        overflow: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .jobcard {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px 12px;
        background: #f8fafc;
      }
      .company {
        font-size: 11px;
        color: #64748b;
        margin: 0 0 2px;
      }
      .title {
        font-size: 14px;
        font-weight: 650;
        line-height: 1.35;
        margin: 0;
      }
      .page-kind {
        margin: 6px 0 0;
        font-size: 11px;
        color: #94a3b8;
      }
      .btn {
        appearance: none;
        border: 0;
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 650;
        cursor: pointer;
        width: 100%;
      }
      .btn.primary {
        background: #0d9488;
        color: #fff;
      }
      .btn.primary:disabled { opacity: 0.55; cursor: default; }
      .btn.secondary {
        background: #fff;
        color: #0f172a;
        border: 1px solid #cbd5e1;
      }
      .btn.secondary:disabled { opacity: 0.55; cursor: default; }
      .btn.linkish {
        background: transparent;
        color: #0d9488;
        border: 0;
        padding: 6px;
        font-size: 12px;
      }
      .btn.sm {
        padding: 5px 8px;
        font-size: 11px;
        width: auto;
        border-radius: 8px;
      }
      .btn.ghost {
        background: #f1f5f9;
        color: #334155;
      }
      .btn.danger-ghost {
        background: transparent;
        color: #64748b;
        border: 1px solid #e2e8f0;
      }
      .stack { display: flex; flex-direction: column; gap: 6px; }
      .row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
      .actions-row {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }
      .actions-row .btn { width: auto; flex: 1; min-width: 0; }
      .saved-chip {
        display: inline-flex;
        align-items: center;
        font-size: 11px;
        font-weight: 650;
        padding: 4px 10px;
        border-radius: 999px;
        background: #ccfbf1;
        color: #0f766e;
        white-space: nowrap;
      }
      .saved-chip[hidden] { display: none !important; }
      .progress {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px;
      }
      .progress-top {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      .bar {
        height: 6px;
        border-radius: 99px;
        background: #e2e8f0;
        overflow: hidden;
      }
      .bar > i {
        display: block;
        height: 100%;
        background: #0d9488;
        width: 0%;
      }
      .fields-details {
        margin-top: 6px;
      }
      .fields-details summary {
        cursor: pointer;
        font-size: 11px;
        color: #64748b;
        list-style: none;
      }
      .fields-details summary::-webkit-details-marker { display: none; }
      .check {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        font-size: 11px;
        padding: 3px 0;
        color: #334155;
      }
      .check.ok { color: #047857; }
      .check.need { color: #b45309; }
      .check.opt { color: #64748b; }
      .status { font-size: 12px; line-height: 1.4; color: #475569; min-height: 1.2em; }
      .status.ok { color: #047857; }
      .status.err { color: #b91c1c; }
      .section {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px;
      }
      .section h3,
      .section-label {
        margin: 0 0 6px;
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      details.section {
        padding: 0;
      }
      details.section > summary {
        cursor: pointer;
        list-style: none;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      details.section > summary::-webkit-details-marker { display: none; }
      details.section > .section-body {
        padding: 0 10px 10px;
      }
      .sum-title {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .kv {
        display: grid;
        gap: 4px;
        font-size: 12px;
        color: #334155;
      }
      .kv div { display: flex; gap: 6px; }
      .kv b { min-width: 64px; color: #64748b; font-weight: 600; }
      .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
      .chip {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 999px;
        background: #f1f5f9;
        color: #475569;
      }
      .postsave { display: none; flex-direction: column; gap: 6px; }
      .postsave.show { display: flex; }
      .account {
        display: none;
        border: 1px solid #fde68a;
        background: #fffbeb;
        border-radius: 10px;
        padding: 10px;
        gap: 6px;
        flex-direction: column;
      }
      .account.show { display: flex; }
      .account p { margin: 0; font-size: 12px; color: #92400e; line-height: 1.4; }
      .account input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #fcd34d;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 12px;
      }
      .review { display: none; flex-direction: column; gap: 6px; }
      .review.show { display: flex; }
      .submit { display: none; flex-direction: column; gap: 6px; }
      .submit.show { display: flex; }
      .btn.warn { background: #f59e0b; color: #111827; }
      .review-card {
        border: 1px dashed #fbbf24;
        border-radius: 8px;
        background: #fffbeb;
        overflow: hidden;
      }
      .review-card.done {
        border-style: solid;
        border-color: #e2e8f0;
        background: #f8fafc;
        opacity: 0.85;
      }
      .review-card.open {
        border-style: solid;
      }
      .review-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 10px;
        cursor: pointer;
      }
      .review-card .q {
        font-size: 12px;
        font-weight: 650;
        color: #334155;
        margin: 0;
        flex: 1;
      }
      .review-body {
        display: none;
        flex-direction: column;
        gap: 8px;
        padding: 0 10px 10px;
      }
      .review-card.open .review-body { display: flex; }
      .review-card textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 56px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px;
        font-size: 12px;
        font-family: inherit;
        color: #0f172a;
        resize: vertical;
      }
      .choice-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        max-height: 160px;
        overflow: auto;
      }
      .choice-filter {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 7px 8px;
        font-size: 12px;
        font-family: inherit;
        color: #0f172a;
      }
      .choice-row .btn.choice {
        flex: 1 1 auto;
        min-width: 72px;
      }
      .choice-row .btn.choice.picked {
        background: #0f766e;
        color: #fff;
        border-color: #0f766e;
      }
      .choice-row .btn.choice[hidden] {
        display: none;
      }
      .review-card .promote {
        display: none;
        font-size: 11px;
        color: #475569;
        gap: 6px;
        flex-direction: column;
      }
      .review-card .promote.show { display: flex; }
      .files { display: none; flex-direction: column; gap: 6px; }
      .files.show { display: flex; }
      .files .doc-actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .resume-slot {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
      }
      .resume-slot:empty { display: none; border: 0; padding: 0; margin: 0; }
      .resume-slot .check {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        font-size: 12px;
        color: #334155;
      }
      .resume-slot .check.ok { color: #047857; }
      .resume-slot .check.need { color: #b45309; }
      .files select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 7px 8px;
        font-size: 12px;
        background: #fff;
        color: #0f172a;
      }
      .muted { font-size: 12px; color: #64748b; }
      .hint { font-size: 11px; color: #64748b; line-height: 1.4; margin: 0; }

      .fab {
        pointer-events: auto;
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483646;
        appearance: none;
        border: 0;
        border-radius: 999px;
        padding: 12px 16px;
        font-weight: 700;
        font-size: 13px;
        background: #0d9488;
        color: #fff;
        box-shadow: 0 10px 30px rgba(13, 148, 136, 0.35);
        cursor: pointer;
        font-family: inherit;
        display: none;
      }
      :host([data-collapsed="1"]) .dock { display: none; }
      :host([data-collapsed="1"]) .fab { display: inline-flex; }
    </style>
    <div class="dock">
      <div class="panel">
        <div class="head">
          <div class="brand">Hire<span>IQ</span></div>
          <button type="button" class="iconbtn" id="hiq-collapse" title="Collapse">›</button>
        </div>
        <div class="body">
          <div class="jobcard">
            <p class="company" id="hiq-company">${escapeHtml(scraped.company || 'Job page')}</p>
            <p class="title" id="hiq-title">${escapeHtml(scraped.title.slice(0, 100))}</p>
            <p class="page-kind" id="hiq-page-kind"${kindHint ? '' : ' hidden'}>${escapeHtml(kindHint)}</p>
          </div>
          <div class="actions-row">
            <button type="button" class="btn primary" id="hiq-autofill" disabled>Autofill</button>
            <button type="button" class="btn secondary" id="hiq-save">Save to HireIQ</button>
            <span class="saved-chip" id="hiq-saved-chip" hidden>Saved</span>
          </div>
          <div class="account" id="hiq-account">
            <h3 class="section-label" style="color:#92400e;margin:0" id="hiq-account-title">Employer account needed</h3>
            <p id="hiq-account-reason">This site wants you to create / sign in to an account.</p>
            <p id="hiq-account-body">Create the account yourself, or let HireIQ continue when tracking is on.</p>
            <button type="button" class="btn secondary" id="hiq-agentic-continue" hidden>Continue to application</button>
            <button type="button" class="btn primary" id="hiq-agentic-create" hidden>Create account &amp; continue</button>
            <input id="hiq-ats-email" type="email" placeholder="email you used on this site" />
            <button type="button" class="btn secondary" id="hiq-ats-save">Save ATS email</button>
          </div>
          <details class="section" id="hiq-autofill-info" open>
            <summary>
              <span class="sum-title">Autofill Information</span>
              <span class="muted" id="hiq-preview-summary">Sign in to load…</span>
            </summary>
            <div class="section-body">
              <div class="muted" id="hiq-preview-loading">Sign in to load master resume…</div>
              <div class="kv" id="hiq-preview" hidden></div>
              <button type="button" class="btn linkish" id="hiq-edit-profile" hidden>Edit master profile →</button>
              <div class="progress" style="margin-top:8px">
                <div class="progress-top">
                  <span id="hiq-prog-label">Form progress</span>
                  <span id="hiq-prog-pct">0%</span>
                </div>
                <div class="bar"><i id="hiq-prog-bar"></i></div>
                <details class="fields-details">
                  <summary>Show fields</summary>
                  <div id="hiq-checks"><div class="muted">Connect HireIQ in the popup, then Autofill.</div></div>
                </details>
              </div>
              <div id="hiq-resume-slot" class="resume-slot"></div>
            </div>
          </details>
          <div class="section review" id="hiq-review">
            <h3>Questions</h3>
            <p class="hint" id="hiq-review-hint">Repetitive ATS questions — pick or type answers here.</p>
            <div id="hiq-review-list"></div>
          </div>
          <div class="section submit" id="hiq-submit-wrap">
            <h3>Submit</h3>
            <p class="hint" id="hiq-submit-hint">You watch the click — HireIQ never submits silently.</p>
            <button type="button" class="btn primary" id="hiq-submit" disabled>Submit on this site</button>
          </div>
          <div class="status" id="hiq-status"></div>
        </div>
      </div>
    </div>
    <button type="button" class="fab" id="hiq-expand">HireIQ</button>
  `

  document.body
    ? document.body.appendChild(root)
    : document.documentElement.appendChild(root)

  const statusEl = shadow.getElementById('hiq-status')!
  const saveBtn = shadow.getElementById('hiq-save') as HTMLButtonElement
  const savedChip = shadow.getElementById('hiq-saved-chip')!
  const autofillBtn = shadow.getElementById('hiq-autofill') as HTMLButtonElement
  const accountEl = shadow.getElementById('hiq-account')!
  const accountTitle = shadow.getElementById('hiq-account-title')!
  const accountReason = shadow.getElementById('hiq-account-reason')!
  const accountBody = shadow.getElementById('hiq-account-body')!
  const agenticContinueBtn = shadow.getElementById('hiq-agentic-continue') as HTMLButtonElement
  const agenticCreateBtn = shadow.getElementById('hiq-agentic-create') as HTMLButtonElement
  const atsEmailInput = shadow.getElementById('hiq-ats-email') as HTMLInputElement
  const atsSaveBtn = shadow.getElementById('hiq-ats-save') as HTMLButtonElement
  const previewLoading = shadow.getElementById('hiq-preview-loading')!
  const previewEl = shadow.getElementById('hiq-preview')!
  const previewSummary = shadow.getElementById('hiq-preview-summary')!
  const editProfileBtn = shadow.getElementById('hiq-edit-profile') as HTMLButtonElement
  const collapseBtn = shadow.getElementById('hiq-collapse') as HTMLButtonElement
  const expandBtn = shadow.getElementById('hiq-expand') as HTMLButtonElement
  const checksEl = shadow.getElementById('hiq-checks')!
  const progLabel = shadow.getElementById('hiq-prog-label')!
  const progPct = shadow.getElementById('hiq-prog-pct')!
  const progBar = shadow.getElementById('hiq-prog-bar') as HTMLElement
  const reviewEl = shadow.getElementById('hiq-review')!
  const reviewList = shadow.getElementById('hiq-review-list')!
  const filesEl = shadow.getElementById('hiq-resume-slot')!
  const submitWrap = shadow.getElementById('hiq-submit-wrap')!
  const submitBtn = shadow.getElementById('hiq-submit') as HTMLButtonElement
  const submitHint = shadow.getElementById('hiq-submit-hint')!
  const filesBody = filesEl


  let trackerUrl = ''
  let resumeUrl = ''
  let coverUrl = ''
  let profileUrl = ''
  let savedJobId = ''
  let profile: AutofillProfile | null = null
  let applyIdentity: ApplyIdentity | null = null
  let reviewItems: ReviewItem[] = []
  let expandedReviewIdx: number | null = null
  let resumes: ResumeOption[] = []
  let selectedResumeId = ''
  let lastFilesOpts: {
    resumeAttached?: boolean
    coverAttached?: boolean
    resumeAvailable?: boolean
    coverAvailable?: boolean
    hasResumeInput?: boolean
    hasCoverInput?: boolean
  } = {}

  function setStatus(msg: string, kind: '' | 'ok' | 'err' = '') {
    statusEl.className = `status${kind ? ` ${kind}` : ''}`
    statusEl.textContent = msg
  }

  function markJobSaved(opts: {
    jobId: string
    trackerUrl?: string
    resumeUrl?: string
    coverUrl?: string
  }) {
    savedJobId = opts.jobId
    trackerUrl = opts.trackerUrl || trackerUrl
    resumeUrl = opts.resumeUrl || trackerUrl
    coverUrl = opts.coverUrl || trackerUrl
    saveBtn.hidden = true
    savedChip.hidden = false
    autofillBtn.disabled = false
    refreshAuthWall()
    refreshSubmitUi()
    showDocumentsSection()
  }

  function renderPreview(p: Preview) {
    previewLoading.hidden = true
    previewEl.hidden = false
    const summary = [p.fullName, p.email, p.location].filter(Boolean).join(' · ')
    previewSummary.textContent = summary || 'Master profile loaded'
    const exp = p.experience
      .filter(e => e.title || e.company)
      .map(e => `${e.title}${e.company ? ` · ${e.company}` : ''}`)
      .slice(0, 3)
      .join(' · ')
    const skills = (p.skills || [])
      .slice(0, 6)
      .map(s => `<span class="chip">${escapeHtml(s)}</span>`)
      .join('')
    previewEl.innerHTML = `
      <div><b>Name</b><span>${escapeHtml(p.fullName)}</span></div>
      ${p.headline ? `<div><b>Title</b><span>${escapeHtml(p.headline)}</span></div>` : ''}
      <div><b>Email</b><span>${escapeHtml(p.email)}</span></div>
      <div><b>Phone</b><span>${escapeHtml(p.phone)}</span></div>
      ${p.location ? `<div><b>Loc</b><span>${escapeHtml(p.location)}</span></div>` : ''}
      ${p.linkedin ? `<div><b>LinkedIn</b><span>${escapeHtml(p.linkedin)}</span></div>` : ''}
      ${exp ? `<div><b>Exp</b><span>${escapeHtml(exp)}</span></div>` : ''}
      ${skills ? `<div class="chips">${skills}</div>` : ''}
    `
    editProfileBtn.hidden = !profileUrl
  }

  function formNeedsResumeAttach() {
    return Boolean(lastFilesOpts.hasResumeInput || findResumeFileInput())
  }

  function resumeAttachedOk() {
    return Boolean(lastFilesOpts.resumeAttached)
  }

  function updateProgress(report: FillReport) {
    let total = report.requiredTotal || report.fillableCount || report.items.length
    let filled = report.requiredTotal ? report.requiredFilled : report.filledCount
    const needsResume = formNeedsResumeAttach()
    if (needsResume) {
      total += 1
      if (resumeAttachedOk()) filled += 1
    }
    const p = pct(filled, total)
    progLabel.textContent = total ? `${filled}/${total} ready` : 'Form progress'
    progPct.textContent = `${p}%`
    progBar.style.width = `${p}%`
    let html = renderChecklist(report)
    if (needsResume) {
      const ok = resumeAttachedOk()
      html += `<div class="check ${ok ? 'ok' : 'need'}"><span>${ok ? '✓' : '○'}</span><span>Resume PDF</span></div>`
    }
    checksEl.innerHTML = html
  }

  async function loadProfile(): Promise<AutofillProfile> {
    const settings = await getSettings()
    const bearer = await getExtensionBearer()
    const res = await extensionFetch(`${settings.apiBaseUrl.replace(/\/$/, '')}/api/extension/profile`, {
      headers: { Authorization: `Bearer ${bearer}` },
    })
    const json = (res.json || {}) as {
      error?: string
      profile?: AutofillProfile
      autofillPreview?: Preview
      profileUrl?: string
      applyIdentity?: ApplyIdentity
    }
    if (!res.ok || !json.profile) throw new Error(json.error || res.error || `Profile failed (${res.status})`)
    profile = json.profile
    applyIdentity = json.applyIdentity ?? null
    profileUrl = json.profileUrl || ''
    if (json.autofillPreview) renderPreview(json.autofillPreview)
    refreshAuthWall()
    return json.profile
  }

  function buildAgenticContext(): AgenticApplyContext | null {
    if (!applyIdentity || !profile) return null
    return {
      applyIdentity,
      firstName: profile.firstName,
      lastName: profile.lastName,
      sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
      fetchVerificationCode: async jobId => {
        const settings = await getSettings()
        const bearer = await getExtensionBearer()
        const res = await extensionFetch(
          `${settings.apiBaseUrl.replace(/\/$/, '')}/api/extension/jobs/${jobId}/verification-code`,
          { headers: { Authorization: `Bearer ${bearer}` } },
        )
        const json = (res.json || {}) as { code?: string | null; error?: string }
        return { code: json.code ?? null, error: json.error || res.error }
      },
      savePortalCredentials: async (jobId, email, password, note) => {
        const settings = await getSettings()
        const bearer = await getExtensionBearer()
        await extensionFetch(
          `${settings.apiBaseUrl.replace(/\/$/, '')}/api/extension/jobs/${jobId}/ats-account`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${bearer}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, note }),
          },
        )
        atsEmailInput.value = email
      },
      onStatus: (message, kind) => setStatus(message, kind || ''),
    }
  }

  /** Only returns when already saved — never auto-saves. */
  async function ensureJobSaved(): Promise<string> {
    if (savedJobId) return savedJobId
    throw new Error('Save this job first')
  }

  async function saveJobToHireIQ(): Promise<string> {
    if (savedJobId) return savedJobId
    const settings = await getSettings()
    const bearer = await getExtensionBearer()
    const job = scrape()
    const detect = detectJobPage(job.url, document)
    if (!detect.isJobPage) throw new Error(detect.reason)

    const res = await extensionFetch(`${settings.apiBaseUrl.replace(/\/$/, '')}/api/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(job),
    })
    const json = (res.json || {}) as {
      error?: string
      jobId?: string
      trackerUrl?: string
      resumeUrl?: string
      coverUrl?: string
    }
    if (!res.ok || !json.jobId) throw new Error(json.error || res.error || `Save failed (${res.status})`)

    markJobSaved({
      jobId: json.jobId,
      trackerUrl: json.trackerUrl,
      resumeUrl: json.resumeUrl,
      coverUrl: json.coverUrl,
    })
    await loadResumes()
    return savedJobId
  }

  async function checkExistingSave() {
    const settings = await getSettings()
    const bearer = await getExtensionBearer()
    const base = settings.apiBaseUrl.replace(/\/$/, '')
    const res = await extensionFetch(
      `${base}/api/extension/jobs/by-url?url=${encodeURIComponent(location.href)}`,
      { headers: { Authorization: `Bearer ${bearer}` } },
    )
    const json = (res.json || {}) as {
      saved?: boolean
      jobId?: string
      trackerUrl?: string
      resumeUrl?: string
      coverUrl?: string
      error?: string
    }
    if (!res.ok) {
      setStatus(json.error || res.error || 'Could not check saved status', 'err')
      setUnsavedGate()
      return
    }
    if (json.saved && json.jobId) {
      markJobSaved({
        jobId: json.jobId,
        trackerUrl: json.trackerUrl,
        resumeUrl: json.resumeUrl,
        coverUrl: json.coverUrl,
      })
      setStatus('Job already saved — Autofill ready.', 'ok')
      await loadResumes()
    } else {
      setUnsavedGate()
    }
  }

  function setUnsavedGate() {
    savedJobId = ''
    saveBtn.hidden = false
    saveBtn.disabled = false
    savedChip.hidden = true
    autofillBtn.disabled = true
    refreshSubmitUi()
    setStatus('Save this job first')
    hideDocumentsIfEmpty()
  }

  async function loadResumes() {
    if (!savedJobId) {
      resumes = []
      selectedResumeId = ''
      return
    }
    try {
      const settings = await getSettings()
      const bearer = await getExtensionBearer()
      const base = settings.apiBaseUrl.replace(/\/$/, '')
      const res = await extensionFetch(`${base}/api/extension/jobs/${savedJobId}/resumes`, {
        headers: { Authorization: `Bearer ${bearer}` },
      })
      const json = (res.json || {}) as { resumes?: ResumeOption[]; error?: string }
      if (!res.ok) {
        resumes = []
        selectedResumeId = ''
        return
      }
      resumes = Array.isArray(json.resumes) ? json.resumes : []
      selectedResumeId = resumes[0]?.id || ''
      renderFilesUi({
        ...lastFilesOpts,
        hasResumeInput: Boolean(findResumeFileInput()),
        hasCoverInput: Boolean(findCoverFileInput()),
      })
    } catch {
      resumes = []
      selectedResumeId = ''
    }
  }

  function getSelectedResumeId(): string {
    const sel = shadow.getElementById('hiq-resume-pick') as HTMLSelectElement | null
    if (sel?.value) return sel.value
    return selectedResumeId || resumes[0]?.id || ''
  }

  function nextPendingReviewIdx(from = 0): number | null {
    const forward = reviewItems.findIndex((it, i) => i >= from && it.status === 'pending')
    if (forward >= 0) return forward
    const any = reviewItems.findIndex(it => it.status === 'pending')
    return any >= 0 ? any : null
  }

  function renderReview() {
    refreshSubmitUi()
    if (!reviewItems.length) {
      reviewEl.classList.remove('show')
      reviewList.innerHTML = ''
      expandedReviewIdx = null
      return
    }
    if (expandedReviewIdx == null || !reviewItems[expandedReviewIdx] || reviewItems[expandedReviewIdx].status !== 'pending') {
      expandedReviewIdx = nextPendingReviewIdx()
    }
    reviewEl.classList.add('show')
    reviewList.innerHTML = reviewItems
      .map((item, idx) => {
        const done = item.status !== 'pending'
        const open = !done && expandedReviewIdx === idx
        const hasChoices = Boolean(item.choices && item.choices.length >= 2)
        const needsFilter = hasChoices && (item.choices?.length || 0) > 8
        const choiceButtons = hasChoices
          ? `${
              needsFilter
                ? `<input class="choice-filter" data-filter-idx="${idx}" type="search" placeholder="Type to filter…" autocomplete="off" />`
                : ''
            }<div class="choice-row" data-choices="${idx}">${item
              .choices!.map(
                (c, ci) =>
                  `<button type="button" class="btn sm secondary choice${
                    item.answer &&
                    (item.answer === c.label || item.answer === c.value)
                      ? ' picked'
                      : ''
                  }" data-act="pick" data-idx="${idx}" data-choice="${ci}">${escapeHtml(c.label)}</button>`,
              )
              .join('')}</div>`
          : ''
        const textArea = hasChoices
          ? ''
          : `<textarea data-idx="${idx}" placeholder="${escapeHtml(
              item.placeholder || (item.manual ? 'Type your answer…' : ''),
            )}">${escapeHtml(item.answer)}</textarea>`
        const actions = hasChoices
          ? `<div class="row" data-actions="${idx}">
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${idx}">Skip</button>
            </div>`
          : `<div class="row" data-actions="${idx}">
              <button type="button" class="btn sm primary" data-act="accept" data-idx="${idx}">${
                item.missingProfile ? 'Add & use' : 'Accept'
              }</button>
              <button type="button" class="btn sm ghost" data-act="edit" data-idx="${idx}">Edit (save)</button>
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${idx}">Skip</button>
            </div>`
        const badge = item.missingProfile
          ? ' <span class="muted">(missing from profile)</span>'
          : item.manual && !hasChoices
            ? ' <span class="muted">(you answer)</span>'
            : hasChoices
              ? ' <span class="muted">(pick one)</span>'
              : ''
        return `
        <div class="review-card ${done ? 'done' : ''} ${open ? 'open' : ''}" data-idx="${idx}">
          <div class="review-head" data-toggle="${idx}">
            <p class="q">${escapeHtml(item.label)}${badge}</p>
            ${done ? `<span class="muted">${item.status === 'accepted' ? 'Accepted' : 'Skipped'}</span>` : ''}
          </div>
          ${
            open
              ? `
          <div class="review-body">
            ${choiceButtons}
            ${textArea}
            ${actions}
            <div class="promote ${item.askPromote ? 'show' : ''}" data-promote="${idx}">
              <span>Also save to master?</span>
              <div class="row">
                <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${idx}">Yes</button>
                <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${idx}">No</button>
              </div>
            </div>
          </div>`
              : item.askPromote
                ? `
          <div class="review-body" style="display:flex">
            <div class="promote show" data-promote="${idx}">
              <span>Also save to master?</span>
              <div class="row">
                <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${idx}">Yes</button>
                <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${idx}">No</button>
              </div>
            </div>
          </div>`
                : ''
          }
        </div>`
      })
      .join('')
  }

  async function autoNaFollowUpsAfterNo(fromIdx: number) {
    let filled = 0
    for (let i = fromIdx + 1; i < reviewItems.length; i++) {
      const it = reviewItems[i]
      if (it.status !== 'pending') continue
      if (it.choices && it.choices.length >= 2) continue
      if (!isFollowUpQuestionLabel(it.label)) continue
      it.answer = AUTO_NA_ANSWER
      acceptProvisional(it.el, AUTO_NA_ANSWER)
      it.status = 'accepted'
      it.askPromote = false
      try {
        await postAccept(it, AUTO_NA_ANSWER, false)
      } catch {
        /* still leave N/A on the form */
      }
      filled += 1
    }
    if (filled) {
      setStatus(`Filled ${filled} follow-up${filled === 1 ? '' : 's'} with N/A.`, 'ok')
    }
  }

  async function acceptReviewAnswer(idx: number, rawAnswer: string, fromChoice = false) {
    const item = reviewItems[idx]
    if (!item || !rawAnswer) {
      setStatus(fromChoice ? 'Pick an option.' : 'Enter an answer before accepting.', 'err')
      return
    }
    let answer = rawAnswer
    item.answer = answer
    if (item.choices && item.choices.length >= 2) {
      const choice =
        item.choices.find(c => c.label === answer || c.value === answer) ||
        matchChoiceLabel(answer, item.choices) ||
        item.choices.find(
          c => c.label.toLowerCase() === answer.toLowerCase() || c.value.toLowerCase() === answer.toLowerCase(),
        )
      if (choice) {
        if (item.choiceMode === 'combobox') {
          const ok = await applyComboboxChoice(item.el, choice)
          if (!ok) acceptProvisional(item.el, choice.label)
        } else {
          applyChoiceToField(item.el, choice, item.choiceMode === 'radio' ? 'radio' : 'select')
        }
        answer = choice.label
        item.answer = answer
      } else {
        acceptProvisional(item.el, answer)
      }
    } else {
      acceptProvisional(item.el, answer)
    }
    item.status = 'accepted'
    const { lasting } = await postAccept(item, answer, false)
    item.lasting = lasting || Boolean(item.missingProfile)
    item.askPromote = item.lasting
    if (isNegativeChoice(answer)) {
      await autoNaFollowUpsAfterNo(idx)
    }
    expandedReviewIdx = nextPendingReviewIdx(idx + 1)
    renderReview()
    if (profile) updateProgress(scanFormProgress(profile))
    setStatus(
      item.askPromote
        ? item.missingProfile
          ? 'Added on the form. Save to your HireIQ profile?'
          : 'Accepted. Save to master?'
        : 'Accepted.',
      'ok',
    )
  }

  function pendingReviewCount() {
    return reviewItems.filter(i => i.status === 'pending').length
  }

  function refreshSubmitUi() {
    submitWrap.classList.add('show')
    if (!savedJobId) {
      submitBtn.disabled = true
      submitBtn.className = 'btn primary'
      submitBtn.textContent = 'Submit on this site'
      submitHint.textContent = 'Save this job first'
      return
    }
    if (isSubmitAutomationBlocked(location.href)) {
      submitBtn.disabled = true
      submitBtn.textContent = 'Submit yourself on this site'
      submitHint.textContent =
        'LinkedIn / Indeed: HireIQ won’t click Submit — finish the application yourself.'
      return
    }
    const found = findSubmitButton(document)
    const pending = pendingReviewCount()
    if (!found) {
      submitBtn.disabled = true
      submitBtn.textContent = 'No submit button found'
      submitHint.textContent = 'Scroll the form — when a Submit / Apply button appears, it shows here.'
      return
    }

    const needsResume = formNeedsResumeAttach() && !resumeAttachedOk()
    if (needsResume) {
      submitBtn.disabled = true
      submitBtn.className = 'btn warn'
      submitBtn.textContent = 'Finish Autofill to submit'
      submitHint.textContent =
        'This form needs a resume — generate on HireIQ, then attach under Autofill Information.'
      return
    }

    submitBtn.disabled = false
    submitBtn.className = pending ? 'btn warn' : 'btn primary'
    submitBtn.textContent = pending
      ? `Submit anyway (${pending} unanswered)`
      : `Submit: ${found.label.slice(0, 40)}`
    submitHint.textContent = pending
      ? 'Gray drafts still need Accept / Skip. You can submit anyway if you prefer.'
      : `Ready — clicks “${found.label.slice(0, 48)}” on the page while you watch.`
  }

  async function markAppliedOnHireIQ() {
    if (!savedJobId) return
    try {
      const settings = await getSettings()
      const bearer = await getExtensionBearer()
      await extensionFetch(
        `${settings.apiBaseUrl.replace(/\/$/, '')}/api/extension/jobs/${savedJobId}/status`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${bearer}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'applied',
            meta: { source: 'extension_submit', url: location.href },
          }),
        },
      )
    } catch {
      /* non-fatal */
    }
  }

  async function postAccept(
    item: ReviewItem,
    answer: string,
    promoteToMaster?: boolean,
  ): Promise<{ lasting: boolean }> {
    const settings = await getSettings()
    const bearer = await getExtensionBearer()
    const res = await extensionFetch(
      `${settings.apiBaseUrl.replace(/\/$/, '')}/api/extension/autofill/accept`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: savedJobId,
          key: item.key,
          question: item.label,
          answer,
          promoteToMaster: Boolean(promoteToMaster),
        }),
      },
    )
    const json = (res.json || {}) as { error?: string; lasting?: boolean }
    if (!res.ok) throw new Error(json.error || res.error || `Accept failed (${res.status})`)
    return { lasting: Boolean(json.lasting ?? item.lasting) }
  }

  reviewList.addEventListener('input', e => {
    const t = e.target as HTMLElement
    if (!(t instanceof HTMLInputElement) || !t.classList.contains('choice-filter')) return
    const idx = Number(t.getAttribute('data-filter-idx'))
    const q = t.value.replace(/\s+/g, ' ').trim().toLowerCase()
    const row = reviewList.querySelector(`.choice-row[data-choices="${idx}"]`)
    if (!row) return
    for (const btn of Array.from(row.querySelectorAll('button.choice'))) {
      const label = (btn.textContent || '').toLowerCase()
      btn.toggleAttribute('hidden', Boolean(q) && !label.includes(q))
    }
  })

  reviewList.addEventListener('click', async e => {
    const t = e.target as HTMLElement
    const card = t.closest('.review-card') as HTMLElement | null
    if (!card) return
    const idx = Number(card.getAttribute('data-idx'))
    const item = reviewItems[idx]
    if (!item) return

    const act = t.getAttribute('data-act')
    if (!act) {
      if (t.closest('textarea')) return
      // Accordion: expand this card (one at a time)
      if (item.status === 'pending' && expandedReviewIdx !== idx) {
        expandedReviewIdx = idx
        renderReview()
      }
      highlightEl(item.el)
      return
    }

    e.stopPropagation()

    const ta = reviewList.querySelector(`textarea[data-idx="${idx}"]`) as HTMLTextAreaElement | null
    const answer = (ta?.value ?? item.answer).trim()

    try {
      if (act === 'pick') {
        const ci = Number(t.getAttribute('data-choice'))
        const choice = item.choices?.[ci]
        if (!choice) return
        await acceptReviewAnswer(idx, choice.label || choice.value, true)
        return
      }

      if (act === 'edit') {
        if (!answer) {
          setStatus('Enter an answer before saving the edit.', 'err')
          return
        }
        item.answer = answer
        applyProvisional(item.el, answer)
        setStatus('Updated draft on the form.', 'ok')
        return
      }

      if (act === 'skip') {
        clearProvisional(item.el)
        item.status = 'skipped'
        item.askPromote = false
        expandedReviewIdx = nextPendingReviewIdx(idx + 1)
        renderReview()
        if (profile) updateProgress(scanFormProgress(profile))
        setStatus('Skipped — field cleared.', '')
        return
      }

      if (act === 'accept') {
        await acceptReviewAnswer(idx, answer, false)
        return
      }

      if (act === 'promote-yes') {
        await postAccept(item, item.answer, true)
        item.askPromote = false
        renderReview()
        setStatus('Queued for master profile.', 'ok')
        return
      }

      if (act === 'promote-no') {
        item.askPromote = false
        renderReview()
        return
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Review action failed', 'err')
    }
  })

  async function tryAttachPdf(type: 'resume' | 'cover') {
    if (!savedJobId) return { attached: false, available: false }
    const input = type === 'resume' ? findResumeFileInput() : findCoverFileInput()
    if (!input) return { attached: false, available: false }

    const settings = await getSettings()
    const bearer = await getExtensionBearer()
    const base = settings.apiBaseUrl.replace(/\/$/, '')
    const tailored = type === 'resume' ? getSelectedResumeId() : ''
    const qs = `type=${type}${tailored ? `&tailoredResumeId=${encodeURIComponent(tailored)}` : ''}`
    const res = await extensionFetch(`${base}/api/extension/jobs/${savedJobId}/pdf?${qs}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: 'application/pdf',
      },
      responseType: 'base64',
    })

    const json = (res.json || {}) as { available?: boolean; error?: string }
    if (res.base64 && res.ok) {
      const filename = type === 'resume' ? 'HireIQ-resume.pdf' : 'HireIQ-cover.pdf'
      const file = base64ToFile(res.base64, filename, res.contentType || 'application/pdf')
      const ok = attachFileToInput(input, file)
      return { attached: ok, available: true as const }
    }
    return { attached: false, available: Boolean(json.available) }
  }

  function showDocumentsSection() {
    renderFilesUi(lastFilesOpts)
  }

  function hideDocumentsIfEmpty() {
    if (!savedJobId) filesBody.innerHTML = ''
  }

  function renderFilesUi(opts: {
    resumeAttached?: boolean
    coverAttached?: boolean
    resumeAvailable?: boolean
    coverAvailable?: boolean
    hasResumeInput?: boolean
    hasCoverInput?: boolean
  }) {
    lastFilesOpts = {
      ...opts,
      hasResumeInput: opts.hasResumeInput ?? Boolean(findResumeFileInput()),
      hasCoverInput: opts.hasCoverInput ?? Boolean(findCoverFileInput()),
    }
    if (!savedJobId) {
      filesBody.innerHTML = ''
      return
    }

    const hasResume = Boolean(lastFilesOpts.hasResumeInput)
    const bits: string[] = []
    bits.push(`<div class="doc-actions">
      <button type="button" class="btn secondary" id="hiq-gen-resume">Generate tailored resume</button>
      <button type="button" class="btn secondary" id="hiq-gen-cover">Generate cover letter</button>
      <button type="button" class="btn linkish" id="hiq-open">Open job in HireIQ →</button>
    </div>`)

    if (hasResume) {
      bits.push(
        lastFilesOpts.resumeAttached
          ? `<div class="check ok"><span>✓</span><span>Resume PDF attached</span></div>`
          : `<div class="check need"><span>○</span><span>Resume PDF — required for this form</span></div>`,
      )
    }

    if (resumes.length > 0) {
      const options = resumes
        .map(
          r =>
            `<option value="${escapeHtml(r.id)}"${r.id === (selectedResumeId || resumes[0]?.id) ? ' selected' : ''}>${escapeHtml(r.label)}</option>`,
        )
        .join('')
      bits.push(
        `<label class="muted" for="hiq-resume-pick" style="display:block;margin-bottom:2px">Resume version</label><select id="hiq-resume-pick">${options}</select>`,
      )
      if (hasResume && !lastFilesOpts.resumeAttached) {
        bits.push(`<button type="button" class="btn secondary" id="hiq-attach-resume">Attach selected resume</button>`)
      }
    } else if (hasResume) {
      bits.push(`<div class="muted">No tailored resume yet — generate on HireIQ, then come back.</div>`)
    }

    if (lastFilesOpts.hasCoverInput) {
      if (lastFilesOpts.coverAttached) {
        bits.push(`<div class="check ok"><span>✓</span><span>Cover letter attached</span></div>`)
      } else if (lastFilesOpts.coverAvailable) {
        bits.push(`<button type="button" class="btn secondary" id="hiq-attach-cover">Attach cover letter</button>`)
      }
    }

    filesBody.innerHTML = bits.join('')
    if (profile) updateProgress(scanFormProgress(profile))

    shadow.getElementById('hiq-gen-resume')?.addEventListener('click', () => {
      openHireIQ(resumeUrl || trackerUrl)
      setStatus('Opened HireIQ to generate — come back to attach.', 'ok')
    })
    shadow.getElementById('hiq-gen-cover')?.addEventListener('click', () => {
      openHireIQ(coverUrl || trackerUrl)
      setStatus('Opened HireIQ for cover letter.', 'ok')
    })
    shadow.getElementById('hiq-open')?.addEventListener('click', () => openHireIQ(trackerUrl))

    const sel = shadow.getElementById('hiq-resume-pick') as HTMLSelectElement | null
    if (sel) {
      sel.addEventListener('change', () => {
        selectedResumeId = sel.value
      })
    }
    shadow.getElementById('hiq-attach-resume')?.addEventListener('click', async () => {
      setStatus('Attaching resume…')
      try {
        const r = await tryAttachPdf('resume')
        renderFilesUi({
          ...lastFilesOpts,
          resumeAttached: r.attached,
          resumeAvailable: r.available,
          hasResumeInput: Boolean(findResumeFileInput()),
        })
        setStatus(r.attached ? 'Resume attached.' : 'Resume PDF not ready yet — generate on HireIQ first.', r.attached ? 'ok' : 'err')
        refreshSubmitUi()
      } catch (err) {
        setStatus(friendlyExtensionError(err), 'err')
      }
    })
    shadow.getElementById('hiq-attach-cover')?.addEventListener('click', async () => {
      setStatus('Attaching cover…')
      try {
        const r = await tryAttachPdf('cover')
        renderFilesUi({
          ...lastFilesOpts,
          coverAttached: r.attached,
          coverAvailable: r.available,
          hasCoverInput: Boolean(findCoverFileInput()),
        })
        setStatus(r.attached ? 'Cover attached.' : 'Cover not ready yet.', r.attached ? 'ok' : 'err')
        refreshSubmitUi()
      } catch (err) {
        setStatus(friendlyExtensionError(err), 'err')
      }
    })
  }

  async function refreshResumesOnFocus() {
    if (!savedJobId) return
    const prev = selectedResumeId || resumes[0]?.id || ''
    await loadResumes()
    const newest = resumes[0]
    if (newest && newest.id !== prev) {
      selectedResumeId = newest.id
      setStatus(`New resume ready: ${newest.label}`, 'ok')
    }
    renderFilesUi({
      ...lastFilesOpts,
      hasResumeInput: Boolean(findResumeFileInput()),
      hasCoverInput: Boolean(findCoverFileInput()),
    })
  }

  collapseBtn.addEventListener('click', () => {
    root.setAttribute('data-collapsed', '1')
  })
  expandBtn.addEventListener('click', () => {
    root.removeAttribute('data-collapsed')
  })

  function openHireIQ(url: string) {
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  function refreshAuthWall() {
    const wall = detectAuthWall(document)
    const identity = applyIdentity
    if (identity) {
      accountTitle.textContent = wall.needsAccount ? identity.panelTitle : 'Smart apply'
      accountBody.textContent = identity.panelBody
      if (identity.applyEmail && !atsEmailInput.value.trim()) {
        atsEmailInput.value = identity.applyEmail
      }
    }

    agenticContinueBtn.hidden = true
    agenticCreateBtn.hidden = true

    if (wall.needsAccount) {
      accountEl.classList.add('show')
      accountReason.textContent = wall.reason
      if (identity?.canCreateAccount) {
        agenticCreateBtn.hidden = false
      }
    } else {
      accountReason.textContent = wall.reason
      if (identity && identity.primaryAction !== 'autofill-only') {
        accountEl.classList.add('show')
        agenticContinueBtn.hidden = false
      } else {
        accountEl.classList.remove('show')
      }
    }
  }

  async function runAgentic(action: 'continue' | 'signup') {
    if (!savedJobId) {
      setStatus('Save this job first', 'err')
      return
    }
    const ctx = buildAgenticContext()
    if (!ctx) {
      setStatus('Sign in and load your profile first.', 'err')
      return
    }
    agenticContinueBtn.disabled = true
    agenticCreateBtn.disabled = true
    try {
      if (action === 'signup') {
        await runAgenticApplyStep(ctx, savedJobId)
      } else {
        await runAgenticApplyStep(ctx, savedJobId)
      }
      refreshAuthWall()
      updateProgress(scanFormProgress())
    } catch (err) {
      setStatus(friendlyExtensionError(err), 'err')
    } finally {
      agenticContinueBtn.disabled = false
      agenticCreateBtn.disabled = false
    }
  }

  agenticContinueBtn.addEventListener('click', () => void runAgentic('continue'))
  agenticCreateBtn.addEventListener('click', () => void runAgentic('signup'))

  atsSaveBtn.addEventListener('click', async () => {
    const email = atsEmailInput.value.trim()
    if (!email) {
      setStatus('Enter the email you used on this employer site.', 'err')
      return
    }
    if (!savedJobId) {
      setStatus('Save the job to HireIQ first, then save the ATS email.', 'err')
      return
    }
    atsSaveBtn.disabled = true
    try {
      const settings = await getSettings()
      const bearer = await getExtensionBearer()
      const res = await extensionFetch(
        `${settings.apiBaseUrl.replace(/\/$/, '')}/api/extension/jobs/${savedJobId}/ats-account`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${bearer}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            note: detectAuthWall(document).kind,
          }),
        },
      )
      const json = (res.json || {}) as { error?: string }
      if (!res.ok) throw new Error(json.error || res.error || 'Failed to save ATS email')
      setStatus(`Saved ATS email ${email} for tracking.`, 'ok')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to save ATS email', 'err')
    } finally {
      atsSaveBtn.disabled = false
    }
  })

  editProfileBtn.addEventListener('click', () => openHireIQ(profileUrl))

  submitBtn.addEventListener('click', async () => {
    if (!savedJobId) {
      setStatus('Save this job first', 'err')
      return
    }
    if (isSubmitAutomationBlocked(location.href)) {
      setStatus('Submit this application yourself on LinkedIn / Indeed.', 'err')
      return
    }
    const found = findSubmitButton(document)
    if (!found) {
      setStatus('No Submit / Apply button found on this page.', 'err')
      refreshSubmitUi()
      return
    }
    if (formNeedsResumeAttach() && !resumeAttachedOk()) {
      setStatus('Attach a resume under Autofill Information first.', 'err')
      refreshSubmitUi()
      return
    }
    const pending = pendingReviewCount()
    if (pending > 0) {
      const ok = window.confirm(
        `${pending} answer(s) still need Accept or Skip. Submit the employer form anyway?`,
      )
      if (!ok) return
    }
    submitBtn.disabled = true
    setStatus(`Clicking “${found.label}” on the page…`)
    try {
      await ensureJobSaved()
      highlightEl(found.el)
      clickSubmitButton(found)
      await markAppliedOnHireIQ()
      setStatus(`Submitted via “${found.label}”. Marked Applied in HireIQ.`, 'ok')
      submitBtn.textContent = 'Submitted'
    } catch (err) {
      setStatus(friendlyExtensionError(err), 'err')
      submitBtn.disabled = false
      refreshSubmitUi()
    }
  })

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true
    setStatus('Saving to HireIQ…')
    try {
      await saveJobToHireIQ()
      const bits = [scrape().title, scrape().company].filter(Boolean)
      setStatus(`Saved${bits.length ? `: ${bits.join(' · ')}` : ''}. Next: Autofill or generate docs.`, 'ok')
    } catch (err) {
      setStatus(friendlyExtensionError(err), 'err')
      saveBtn.disabled = false
    }
  })

  autofillBtn.addEventListener('click', async () => {
    autofillBtn.disabled = true
    reviewItems = []
    expandedReviewIdx = null
    renderReview()
    try {
      await ensureJobSaved()

      const p = profile || (await loadProfile())
      setStatus('Filling known fields…')
      const report = await autofillKnownAnimated(p, {
        onField: label => setStatus(`Filling: ${label.slice(0, 40)}…`),
      })
      updateProgress(report)

      const candidates = collectDraftCandidates().slice(0, 25)
      setStatus('Reading dropdown options…')
      await enrichComboboxChoices(candidates)

      const hasChoices = (c: FieldDescriptor) => Boolean(c.choices && c.choices.length >= 2)
      const missingProfileTargets = candidates.filter(
        c => !hasChoices(c) && isMissingProfileValue(c.kind, p),
      )
      const missingKeys = new Set(missingProfileTargets.map(c => c.key))
      const choiceTargets = candidates.filter(c => hasChoices(c) && !missingKeys.has(c.key))
      const aiTargets = candidates.filter(
        c => !hasChoices(c) && !missingKeys.has(c.key) && !isSensitiveFieldLabel(c.label),
      )
      const manualTargets = candidates.filter(
        c => !hasChoices(c) && !missingKeys.has(c.key) && isSensitiveFieldLabel(c.label),
      )

      // Ask for contact/identity gaps first (phone, email, …)
      for (const u of missingProfileTargets) {
        const backfill = isMasterBackfillKind(u.kind)
        reviewItems.push({
          key: u.key,
          label: u.label,
          answer: '',
          lasting: backfill,
          el: u.el,
          status: 'pending',
          askPromote: false,
          manual: true,
          missingProfile: true,
          placeholder: missingProfilePrompt(u.kind),
        })
      }

      for (const u of choiceTargets) {
        const suggested =
          u.kind === 'country' && p.country && u.choices?.length
            ? matchChoiceLabel(p.country, u.choices)
            : null
        reviewItems.push({
          key: u.key,
          label: u.label,
          answer: suggested?.label || '',
          lasting: false,
          el: u.el,
          status: 'pending',
          askPromote: false,
          choices: u.choices,
          choiceMode: u.choiceMode,
        })
      }

      if (aiTargets.length) {
        setStatus(`Drafting ${aiTargets.length} unanswered questions…`)
        const settings = await getSettings()
        const bearer = await getExtensionBearer()
        const job = scrape()
        const res = await extensionFetch(
          `${settings.apiBaseUrl.replace(/\/$/, '')}/api/extension/autofill/drafts`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${bearer}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jobId: savedJobId,
              title: job.title,
              company: job.company,
              description: job.description.slice(0, 4000),
              fields: aiTargets.map(u => ({
                key: u.key,
                label: u.label,
                required: u.required,
                inputType: u.inputType,
              })),
            }),
          },
        )
        const json = (res.json || {}) as { error?: string; drafts?: DraftAnswer[] }
        if (!res.ok) {
          setStatus(
            json.error || res.error || `Drafts failed (${res.status}) — known fields still filled.`,
            'err',
          )
        } else {
          const byKey = new Map((json.drafts || []).map(d => [d.key, d]))
          for (const u of aiTargets) {
            const draft = byKey.get(u.key)
            if (!draft || draft.skip || !draft.answer?.trim()) {
              reviewItems.push({
                key: u.key,
                label: u.label,
                answer: '',
                lasting: Boolean(draft?.lasting),
                el: u.el,
                status: 'pending',
                askPromote: false,
                manual: true,
              })
              continue
            }
            applyProvisional(u.el, draft.answer.trim())
            reviewItems.push({
              key: u.key,
              label: u.label,
              answer: draft.answer.trim(),
              lasting: Boolean(draft.lasting),
              el: u.el,
              status: 'pending',
              askPromote: false,
            })
          }
        }
      }

      for (const u of manualTargets) {
        reviewItems.push({
          key: u.key,
          label: u.label,
          answer: '',
          lasting: false,
          el: u.el,
          status: 'pending',
          askPromote: false,
          manual: true,
        })
      }
      expandedReviewIdx = nextPendingReviewIdx()
      renderReview()
      updateProgress(scanFormProgress(p))

      await loadResumes()

      const resumeInput = findResumeFileInput()
      const coverInput = findCoverFileInput()
      let resumeAttached = false
      let coverAttached = false
      let resumeAvailable = false
      let coverAvailable = false

      if (resumeInput) {
        setStatus('Attaching resume PDF…')
        const r = await tryAttachPdf('resume')
        resumeAttached = Boolean(r?.attached)
        resumeAvailable = Boolean(r?.available || r?.attached)
        if (resumeAttached) highlightEl(resumeInput)
      }
      if (coverInput) {
        setStatus('Attaching cover letter PDF…')
        const c = await tryAttachPdf('cover')
        coverAttached = Boolean(c?.attached)
        coverAvailable = Boolean(c?.available || c?.attached)
        if (coverAttached) highlightEl(coverInput)
      }
      renderFilesUi({
        hasResumeInput: Boolean(resumeInput),
        hasCoverInput: Boolean(coverInput),
        resumeAttached,
        coverAttached,
        resumeAvailable,
        coverAvailable,
      })

      const parts = [
        report.filledCount ? `${report.filledCount} known` : '',
        reviewItems.length ? `${reviewItems.length} to review` : '',
        resumeAttached ? 'resume attached' : '',
        coverAttached ? 'cover attached' : '',
      ].filter(Boolean)
      const reviewHint = reviewItems.some(r => !r.manual)
        ? ' Gray drafts need Accept before submit.'
        : reviewItems.length
          ? ' Answer the remaining questions in the panel.'
          : ''
      setStatus(
        parts.length
          ? `Autofill done: ${parts.join(' · ')}.${reviewHint}`
          : 'No matching fields found on this page.',
        parts.length ? 'ok' : 'err',
      )
      refreshSubmitUi()
    } catch (err) {
      setStatus(friendlyExtensionError(err), 'err')
    } finally {
      autofillBtn.disabled = !savedJobId
    }
  })

  refreshAuthWall()
  refreshSubmitUi()
  setStatus('Checking save status…')
  autofillBtn.disabled = true

  const onTabActive = () => {
    if (document.visibilityState === 'visible') {
      void refreshResumesOnFocus()
    }
  }
  document.addEventListener('visibilitychange', onTabActive)
  window.addEventListener('focus', () => {
    void refreshResumesOnFocus()
  })

  void (async () => {
    try {
      await checkExistingSave()
    } catch (err) {
      setStatus(friendlyExtensionError(err), 'err')
      setUnsavedGate()
    }
    try {
      const p = await loadProfile()
      updateProgress(scanFormProgress(p))
    } catch {
      previewLoading.textContent = 'Connect HireIQ in the popup to load master resume.'
      previewSummary.textContent = 'Connect HireIQ…'
    }
  })()
}

function maybeShow() {
  const detect = detectJobPage(location.href, document)
  if (!detect.isJobPage) {
    removeUi()
    return
  }
  ensureUi()
}

function boot() {
  maybeShow()

  let last = location.href
  setInterval(() => {
    if (location.href !== last) {
      last = location.href
      maybeShow()
    }
  }, 800)

  chrome.runtime.sendMessage({
    type: 'HIREIQ_DETECT',
    detect: detectJobPage(location.href, document),
  }).catch(() => {})
}

/** CRXJS content-script entry — required for the Vite loader to run the module. */
export function onExecute() {
  boot()
}

boot()
