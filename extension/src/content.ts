import { detectJobPage } from './detect'
import { getSettings } from './settings'
import {
  autofillKnownAnimated,
  scanFormProgress,
  collectDraftCandidates,
  applyProvisional,
  acceptProvisional,
  clearProvisional,
  highlightEl,
  findResumeFileInput,
  findCoverFileInput,
  attachFileToInput,
  type FieldDescriptor,
  type FillReport,
} from './autofill'
import { extensionFetch, getExtensionBearer, base64ToFile } from './api'
import { detectAuthWall } from './detect-auth-wall'
import { isSensitiveFieldLabel, type AutofillProfile } from '@hireiq/form-fill'
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
}

function scrape(): {
  url: string
  title: string
  company: string
  description: string
  location: string
} {
  const url = location.href
  const ogTitle =
    document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || ''
  const title =
    ogTitle ||
    document.querySelector('h1')?.textContent?.trim() ||
    document.title.replace(/\s*[|\-–—].*$/, '').trim() ||
    'Untitled role'

  const atMatch = document.title.match(/\bat\s+(.+?)(?:\s*[|\-–—]|$)/i)
  const companyFromTitle = atMatch?.[1]?.trim() || ''

  const company =
    document
      .querySelector(
        '[data-company], .company, .employer, [class*="companyName"], [class*="CompanyName"], .app-title .company-name',
      )
      ?.textContent?.trim() ||
    document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() ||
    companyFromTitle ||
    (() => {
      const logo = document.querySelector('img[alt]') as HTMLImageElement | null
      if (logo?.alt && !/logo/i.test(logo.alt)) return logo.alt.trim()
      const brand = document.querySelector('a[href="/"] img, header img') as HTMLImageElement | null
      return brand?.alt?.replace(/\s*logo$/i, '').trim() || ''
    })() ||
    ''
  const locationText =
    document
      .querySelector(
        '[data-location], .location, [class*="jobLocation"], [class*="JobLocation"], .location-name, .job__location',
      )
      ?.textContent?.trim() || ''
  const main =
    document.querySelector(
      '#content, [data-job-description], .job-description, #job-description, .job__description, [class*="description"], article, main',
    ) || document.body
  let description = (main?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20000)
  if (description.length < 40) description = `Saved from ${url}`
  return {
    url,
    title: title.slice(0, 500),
    company: company.slice(0, 500),
    description,
    location: locationText.slice(0, 500),
  }
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

function ensureUi() {
  if (document.getElementById(ROOT_ID)) return

  const root = document.createElement('div')
  root.id = ROOT_ID
  root.attachShadow({ mode: 'open' })
  const shadow = root.shadowRoot!

  const scraped = scrape()

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .dock {
        position: fixed;
        z-index: 2147483646;
        top: 0;
        right: 0;
        height: 100vh;
        width: min(380px, 92vw);
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
        padding: 14px 16px;
        border-bottom: 1px solid #e2e8f0;
      }
      .brand {
        font-weight: 700;
        font-size: 15px;
        letter-spacing: -0.02em;
      }
      .brand span { color: #0d9488; }
      .iconbtn {
        appearance: none;
        border: 0;
        background: #f1f5f9;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
      }
      .body {
        flex: 1;
        overflow: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .jobcard {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px 14px;
        background: #f8fafc;
      }
      .company {
        font-size: 12px;
        color: #64748b;
        margin: 0 0 4px;
      }
      .title {
        font-size: 15px;
        font-weight: 650;
        line-height: 1.35;
        margin: 0;
      }
      .btn {
        appearance: none;
        border: 0;
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 14px;
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
      .btn.linkish {
        background: transparent;
        color: #0d9488;
        border: 0;
        padding: 8px;
        font-size: 13px;
      }
      .btn.sm {
        padding: 6px 10px;
        font-size: 12px;
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
      .stack { display: flex; flex-direction: column; gap: 8px; }
      .row { display: flex; gap: 6px; flex-wrap: wrap; }
      .progress {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px;
      }
      .progress-top {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .bar {
        height: 6px;
        border-radius: 99px;
        background: #e2e8f0;
        overflow: hidden;
        margin-bottom: 10px;
      }
      .bar > i {
        display: block;
        height: 100%;
        background: #0d9488;
        width: 0%;
      }
      .check {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        font-size: 12px;
        padding: 4px 0;
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
        border-radius: 12px;
        padding: 12px;
      }
      .section h3 {
        margin: 0 0 8px;
        font-size: 12px;
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
      .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
      .chip {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 999px;
        background: #f1f5f9;
        color: #475569;
      }
      .postsave { display: none; flex-direction: column; gap: 8px; }
      .postsave.show { display: flex; }
      .account {
        display: none;
        border: 1px solid #fde68a;
        background: #fffbeb;
        border-radius: 12px;
        padding: 12px;
        gap: 8px;
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
      .review { display: none; flex-direction: column; gap: 10px; }
      .review.show { display: flex; }
      .submit { display: none; flex-direction: column; gap: 8px; }
      .submit.show { display: flex; }
      .btn.warn { background: #f59e0b; color: #111827; }
      .review-card {
        border: 1px dashed #fbbf24;
        border-radius: 10px;
        padding: 10px;
        background: #fffbeb;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .review-card.done {
        border-style: solid;
        border-color: #e2e8f0;
        background: #f8fafc;
        opacity: 0.85;
      }
      .review-card .q {
        font-size: 12px;
        font-weight: 650;
        color: #334155;
        margin: 0;
      }
      .review-card textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 64px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px;
        font-size: 12px;
        font-family: inherit;
        color: #0f172a;
        resize: vertical;
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
      .muted { font-size: 12px; color: #64748b; }

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
          </div>
          <div class="stack">
            <button type="button" class="btn primary" id="hiq-autofill">Autofill</button>
            <button type="button" class="btn secondary" id="hiq-save">Save to HireIQ</button>
          </div>
          <div class="account" id="hiq-account">
            <h3 style="margin:0;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.04em">Employer account needed</h3>
            <p id="hiq-account-reason">This site wants you to create / sign in to an account.</p>
            <p>Create the account yourself (we don’t invent emails). Then save the email here so HireIQ can help track status.</p>
            <input id="hiq-ats-email" type="email" placeholder="email you used on this site" />
            <button type="button" class="btn secondary" id="hiq-ats-save">Save ATS email</button>
          </div>
          <div class="section" id="hiq-autofill-info">
            <h3>Your Autofill Information</h3>
            <div class="muted" id="hiq-preview-loading">Sign in to load master resume…</div>
            <div class="kv" id="hiq-preview" hidden></div>
            <button type="button" class="btn linkish" id="hiq-edit-profile" hidden>Edit master profile →</button>
          </div>
          <div class="section review" id="hiq-review">
            <h3>Review AI answers</h3>
            <div id="hiq-review-list"></div>
          </div>
          <div class="section submit" id="hiq-submit-wrap">
            <h3>Submit</h3>
            <p class="muted" id="hiq-submit-hint" style="margin:0 0 8px;font-size:11px;line-height:1.4">
              You watch the click — HireIQ never submits silently.
            </p>
            <button type="button" class="btn primary" id="hiq-submit" disabled>Submit on this site</button>
          </div>
          <div class="section files" id="hiq-files">
            <h3>Documents</h3>
            <div id="hiq-files-body"></div>
          </div>
          <div class="postsave" id="hiq-postsave">
            <h3 style="margin:0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">After save</h3>
            <button type="button" class="btn secondary" id="hiq-gen-resume">Generate tailored resume</button>
            <button type="button" class="btn secondary" id="hiq-gen-cover">Generate cover letter</button>
            <button type="button" class="btn linkish" id="hiq-open">Open job in HireIQ →</button>
          </div>
          <div class="progress">
            <div class="progress-top">
              <span id="hiq-prog-label">Form progress</span>
              <span id="hiq-prog-pct">0%</span>
            </div>
            <div class="bar"><i id="hiq-prog-bar"></i></div>
            <div id="hiq-checks"><div class="muted">Connect HireIQ in the popup, then Autofill.</div></div>
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
  const autofillBtn = shadow.getElementById('hiq-autofill') as HTMLButtonElement
  const openBtn = shadow.getElementById('hiq-open') as HTMLButtonElement
  const genResumeBtn = shadow.getElementById('hiq-gen-resume') as HTMLButtonElement
  const genCoverBtn = shadow.getElementById('hiq-gen-cover') as HTMLButtonElement
  const postSaveEl = shadow.getElementById('hiq-postsave')!
  const accountEl = shadow.getElementById('hiq-account')!
  const accountReason = shadow.getElementById('hiq-account-reason')!
  const atsEmailInput = shadow.getElementById('hiq-ats-email') as HTMLInputElement
  const atsSaveBtn = shadow.getElementById('hiq-ats-save') as HTMLButtonElement
  const previewLoading = shadow.getElementById('hiq-preview-loading')!
  const previewEl = shadow.getElementById('hiq-preview')!
  const editProfileBtn = shadow.getElementById('hiq-edit-profile') as HTMLButtonElement
  const collapseBtn = shadow.getElementById('hiq-collapse') as HTMLButtonElement
  const expandBtn = shadow.getElementById('hiq-expand') as HTMLButtonElement
  const checksEl = shadow.getElementById('hiq-checks')!
  const progLabel = shadow.getElementById('hiq-prog-label')!
  const progPct = shadow.getElementById('hiq-prog-pct')!
  const progBar = shadow.getElementById('hiq-prog-bar') as HTMLElement
  const reviewEl = shadow.getElementById('hiq-review')!
  const reviewList = shadow.getElementById('hiq-review-list')!
  const filesEl = shadow.getElementById('hiq-files')!
  const submitWrap = shadow.getElementById('hiq-submit-wrap')!
  const submitBtn = shadow.getElementById('hiq-submit') as HTMLButtonElement
  const submitHint = shadow.getElementById('hiq-submit-hint')!
  const filesBody = shadow.getElementById('hiq-files-body')!

  let trackerUrl = ''
  let resumeUrl = ''
  let coverUrl = ''
  let profileUrl = ''
  let savedJobId = ''
  let profile: AutofillProfile | null = null
  let reviewItems: ReviewItem[] = []

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

  function setStatus(msg: string, kind: '' | 'ok' | 'err' = '') {
    statusEl.className = `status${kind ? ` ${kind}` : ''}`
    statusEl.textContent = msg
  }

  function renderPreview(p: Preview) {
    previewLoading.hidden = true
    previewEl.hidden = false
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

  function updateProgress(report: FillReport) {
    const total = report.requiredTotal || report.fillableCount || report.items.length
    const filled = report.requiredTotal ? report.requiredFilled : report.filledCount
    const p = pct(filled, total)
    progLabel.textContent = total ? `${filled}/${total} fields ready` : 'Form progress'
    progPct.textContent = `${p}%`
    progBar.style.width = `${p}%`
    checksEl.innerHTML = renderChecklist(report)
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
    }
    if (!res.ok || !json.profile) throw new Error(json.error || res.error || `Profile failed (${res.status})`)
    profile = json.profile
    profileUrl = json.profileUrl || ''
    if (json.autofillPreview) renderPreview(json.autofillPreview)
    return json.profile
  }

  async function ensureJobSaved(): Promise<string> {
    if (savedJobId) return savedJobId
    const settings = await getSettings()
    const bearer = await getExtensionBearer()
    const job = scrape()
    const detect = detectJobPage(job.url)
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

    savedJobId = json.jobId
    trackerUrl = json.trackerUrl || ''
    resumeUrl = json.resumeUrl || trackerUrl
    coverUrl = json.coverUrl || trackerUrl
    postSaveEl.classList.add('show')
    saveBtn.textContent = 'Saved'
    saveBtn.disabled = true
    refreshAuthWall()
    return savedJobId
  }

  function renderReview() {
    refreshSubmitUi()
    if (!reviewItems.length) {
      reviewEl.classList.remove('show')
      reviewList.innerHTML = ''
      return
    }
    reviewEl.classList.add('show')
    reviewList.innerHTML = reviewItems
      .map((item, idx) => {
        const done = item.status !== 'pending'
        return `
        <div class="review-card ${done ? 'done' : ''}" data-idx="${idx}">
          <p class="q">${escapeHtml(item.label)}${item.manual ? ' <span class="muted">(you answer)</span>' : ''}</p>
          <textarea data-idx="${idx}" placeholder="${item.manual ? 'Type your answer…' : ''}" ${done ? 'disabled' : ''}>${escapeHtml(item.answer)}</textarea>
          <div class="row" data-actions="${idx}">
            ${
              item.status === 'pending'
                ? `
              <button type="button" class="btn sm primary" data-act="accept" data-idx="${idx}">Accept</button>
              <button type="button" class="btn sm ghost" data-act="edit" data-idx="${idx}">Edit (save)</button>
              <button type="button" class="btn sm danger-ghost" data-act="skip" data-idx="${idx}">Skip</button>
            `
                : `<span class="muted">${item.status === 'accepted' ? 'Accepted' : 'Skipped'}</span>`
            }
          </div>
          <div class="promote ${item.askPromote ? 'show' : ''}" data-promote="${idx}">
            <span>Also save to master?</span>
            <div class="row">
              <button type="button" class="btn sm primary" data-act="promote-yes" data-idx="${idx}">Yes</button>
              <button type="button" class="btn sm ghost" data-act="promote-no" data-idx="${idx}">No</button>
            </div>
          </div>
        </div>`
      })
      .join('')
  }

  function pendingReviewCount() {
    return reviewItems.filter(i => i.status === 'pending').length
  }

  function refreshSubmitUi() {
    submitWrap.classList.add('show')
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

  reviewList.addEventListener('click', async e => {
    const t = e.target as HTMLElement
    const card = t.closest('.review-card') as HTMLElement | null
    if (!card) return
    const idx = Number(card.getAttribute('data-idx'))
    const item = reviewItems[idx]
    if (!item) return

    // Card click (not a button) → scroll/highlight field
    if (!t.closest('button') && !t.closest('textarea')) {
      highlightEl(item.el)
      return
    }

    const act = t.getAttribute('data-act')
    if (!act) return
    e.stopPropagation()

    const ta = reviewList.querySelector(`textarea[data-idx="${idx}"]`) as HTMLTextAreaElement | null
    const answer = (ta?.value ?? item.answer).trim()

    try {
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
        renderReview()
        if (profile) updateProgress(scanFormProgress(profile))
        setStatus('Skipped — field cleared.', '')
        return
      }

      if (act === 'accept') {
        if (!answer) {
          setStatus('Answer is empty — edit or skip.', 'err')
          return
        }
        acceptProvisional(item.el, answer)
        item.answer = answer
        item.status = 'accepted'
        const { lasting } = await postAccept(item, answer, false)
        item.askPromote = lasting
        renderReview()
        if (profile) updateProgress(scanFormProgress(profile))
        setStatus(lasting ? 'Accepted. Save to master?' : 'Accepted.', 'ok')
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
    if (!savedJobId) return
    const input = type === 'resume' ? findResumeFileInput() : findCoverFileInput()
    if (!input) return

    const settings = await getSettings()
    const bearer = await getExtensionBearer()
    const base = settings.apiBaseUrl.replace(/\/$/, '')
    const res = await extensionFetch(`${base}/api/extension/jobs/${savedJobId}/pdf?type=${type}`, {
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

  function renderFilesUi(opts: {
    resumeAttached?: boolean
    coverAttached?: boolean
    resumeAvailable?: boolean
    coverAvailable?: boolean
    hasResumeInput?: boolean
    hasCoverInput?: boolean
  }) {
    const bits: string[] = []
    if (opts.hasResumeInput) {
      if (opts.resumeAttached) {
        bits.push(`<div class="muted">Resume PDF attached ✓</div>`)
      } else if (opts.resumeAvailable === false || !opts.resumeAttached) {
        bits.push(
          `<a class="btn linkish" id="hiq-gen-attach-resume" href="${escapeHtml(resumeUrl || trackerUrl)}" target="_blank" rel="noopener">Generate &amp; attach resume</a>`,
        )
      }
    }
    if (opts.hasCoverInput) {
      if (opts.coverAttached) {
        bits.push(`<div class="muted">Cover letter PDF attached ✓</div>`)
      } else {
        bits.push(
          `<a class="btn linkish" id="hiq-gen-attach-cover" href="${escapeHtml(coverUrl || trackerUrl)}" target="_blank" rel="noopener">Generate &amp; attach cover</a>`,
        )
      }
    }
    if (!bits.length) {
      filesEl.classList.remove('show')
      return
    }
    filesEl.classList.add('show')
    filesBody.innerHTML = bits.join('')
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
    if (wall.needsAccount) {
      accountEl.classList.add('show')
      accountReason.textContent = wall.reason
    } else {
      accountEl.classList.remove('show')
    }
  }

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

  openBtn.addEventListener('click', () => openHireIQ(trackerUrl))
  genResumeBtn.addEventListener('click', () => openHireIQ(resumeUrl || trackerUrl))
  genCoverBtn.addEventListener('click', () => openHireIQ(coverUrl || trackerUrl))
  editProfileBtn.addEventListener('click', () => openHireIQ(profileUrl))

  submitBtn.addEventListener('click', async () => {
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
      if (!savedJobId) {
        await ensureJobSaved()
      }
      highlightEl(found.el)
      clickSubmitButton(found)
      await markAppliedOnHireIQ()
      setStatus(`Submitted via “${found.label}”. Marked Applied in HireIQ.`, 'ok')
      submitBtn.textContent = 'Submitted'
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Submit failed', 'err')
      submitBtn.disabled = false
      refreshSubmitUi()
    }
  })

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true
    setStatus('Saving to HireIQ…')
    try {
      await ensureJobSaved()
      const bits = [scrape().title, scrape().company].filter(Boolean)
      setStatus(`Saved${bits.length ? `: ${bits.join(' · ')}` : ''}. Next: Autofill or generate docs.`, 'ok')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed', 'err')
      saveBtn.disabled = false
    }
  })

  autofillBtn.addEventListener('click', async () => {
    autofillBtn.disabled = true
    reviewItems = []
    renderReview()
    try {
      setStatus('Saving job…')
      await ensureJobSaved()

      const p = profile || (await loadProfile())
      setStatus('Filling known fields…')
      const report = await autofillKnownAnimated(p, {
        onField: label => setStatus(`Filling: ${label.slice(0, 40)}…`),
      })
      updateProgress(report)

      // AI drafts + manual cards for remaining empty fields
      const candidates = collectDraftCandidates().slice(0, 25)
      const aiTargets = candidates.filter(c => !isSensitiveFieldLabel(c.label))
      const manualTargets = candidates.filter(c => isSensitiveFieldLabel(c.label))

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
              // Still show empty card so user can type
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
      renderReview()
      updateProgress(scanFormProgress(p))

      // PDF attach
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
      setStatus(err instanceof Error ? err.message : 'Autofill failed', 'err')
    } finally {
      autofillBtn.disabled = false
    }
  })

  refreshAuthWall()
  refreshSubmitUi()
  void (async () => {
    try {
      const p = await loadProfile()
      updateProgress(scanFormProgress(p))
    } catch {
      previewLoading.textContent = 'Connect HireIQ in the popup to load master resume.'
    }
  })()
}

function maybeShow() {
  const detect = detectJobPage(location.href)
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

  chrome.runtime.sendMessage({ type: 'HIREIQ_DETECT', detect: detectJobPage(location.href) }).catch(() => {})
}

/** CRXJS content-script entry — required for the Vite loader to run the module. */
export function onExecute() {
  boot()
}

boot()
