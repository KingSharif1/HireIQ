/**
 * ATS board adapters — map Greenhouse / Lever / Ashby / Workday forms
 * onto the shared FieldKind model. Pure: safe for Node tests + content scripts.
 */
import type { FieldKind } from './form-fill'

export type BoardKind = 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'generic'

export type BoardAdapter = {
  kind: BoardKind
  /** Hostname substrings (e.g. greenhouse.io). */
  hosts: string[]
  formRootSelectors: string[]
  applyFieldSelectors: string[]
  postingSelectors: string[]
  submitSelectors: string[]
  continueSelectors: string[]
  resumeInputSelectors: string[]
  /** Distinctive name/id keys (lowercase, normalized). */
  fieldKeys: Record<string, FieldKind>
  /** Workday-style data-automation-id values. */
  automationIds: Record<string, FieldKind>
}

function key(raw: string): string {
  return raw.toLowerCase().replace(/[_\-[\]]+/g, ' ').replace(/\s+/g, ' ').trim()
}

const GREENHOUSE: BoardAdapter = {
  kind: 'greenhouse',
  hosts: ['greenhouse.io', 'boards.greenhouse.io', 'job-boards.greenhouse.io'],
  formRootSelectors: ['form#application-form', '#application_form', '#s-apply', 'form[id*="application"]'],
  applyFieldSelectors: ['form#application-form', '#application_form', 'input[name="first_name"]', 'input[name="resume"]'],
  postingSelectors: ['#content', '.job__description', '[data-job-description]'],
  submitSelectors: [
    '#submit_app',
    'input#submit_app',
    'input[value="Submit Application" i]',
    'button[aria-label="Submit Application" i]',
  ],
  continueSelectors: [
    'a[href="#app"]',
    'a#apply_button',
    '#apply_button',
  ],
  resumeInputSelectors: ['input[name="resume"]', 'input#resume', 'input[type="file"][name*="resume" i]'],
  fieldKeys: {
    first_name: 'first_name',
    last_name: 'last_name',
    preferred_name: 'preferred_name',
    'job application first name': 'first_name',
    'job application last name': 'last_name',
    'job application email': 'email',
    'job application phone': 'phone',
  },
  automationIds: {},
}

const LEVER: BoardAdapter = {
  kind: 'lever',
  hosts: ['lever.co', 'jobs.lever.co'],
  formRootSelectors: ['form#application-form', '.application-form', 'form[action*="thanks"]'],
  applyFieldSelectors: ['form#application-form', 'input[name="urls[LinkedIn]"]', 'input[name="resume"]'],
  postingSelectors: ['.posting-page', '.posting-description', '[data-qa="job-description"]'],
  submitSelectors: ['.template-btn-submit', 'button.template-btn-submit', 'input.template-btn-submit'],
  continueSelectors: ['.postings-btn', 'a.postings-btn', 'button.postings-btn'],
  resumeInputSelectors: ['input[name="resume"]', 'input[type="file"][name="resume"]'],
  fieldKeys: {
    'urls linkedin': 'linkedin',
    'urls github': 'website',
    'urls portfolio': 'website',
    'urls other': 'website',
    emails: 'email',
    phones: 'phone',
  },
  automationIds: {},
}

const ASHBY: BoardAdapter = {
  kind: 'ashby',
  hosts: ['ashbyhq.com', 'jobs.ashbyhq.com'],
  formRootSelectors: ['#ashby-portal-root form', '#ashby-portal-root', '[data-testid="application-form"]'],
  applyFieldSelectors: ['#ashby-portal-root form', '[data-testid="application-form"]'],
  postingSelectors: ['#ashby-portal-root', '[data-testid="job-description"]'],
  submitSelectors: [
    '#ashby-portal-root button[type="submit"]',
    '[data-testid="application-form"] button[type="submit"]',
  ],
  continueSelectors: [
    '#ashby-portal-root a[href*="application"]',
    '[data-testid="apply-button"]',
  ],
  resumeInputSelectors: [
    '#ashby-portal-root input[type="file"]',
    'input[name="_systemfield_resume"]',
    'input[name*="resume" i][type="file"]',
  ],
  fieldKeys: {
    _systemfield_name: 'full_name',
    _systemfield_email: 'email',
    _systemfield_phone: 'phone',
    _systemfield_linkedin: 'linkedin',
    _systemfield_website: 'website',
    'systemfield name': 'full_name',
    'systemfield email': 'email',
    'systemfield phone': 'phone',
    'systemfield linkedin': 'linkedin',
    'systemfield website': 'website',
  },
  automationIds: {},
}

const WORKDAY: BoardAdapter = {
  kind: 'workday',
  hosts: ['myworkdayjobs.com', 'workday.com', 'wd1.myworkdayjobs.com'],
  formRootSelectors: [
    '[data-automation-id="jobApplicationPage"]',
    '[data-automation-id="applyFlow"]',
    '[data-automation-id="jobPostingPage"]',
  ],
  applyFieldSelectors: [
    '[data-automation-id="jobPostingPage"] form',
    '[data-automation-id="legalNameSection_firstName"]',
    '[data-automation-id="email"]',
  ],
  postingSelectors: ['[data-automation-id="jobPostingPage"]', '[data-automation-id="jobPostingHeader"]'],
  submitSelectors: [
    '[data-automation-id="pageFooterNextButton"]',
    '[data-automation-id="bottom-navigation-save-button"]',
  ],
  continueSelectors: [
    '[data-automation-id="bottom-navigation-next-button"]',
    '[data-automation-id="pageFooterNextButton"]',
    'button[data-automation-id="continueButton"]',
  ],
  resumeInputSelectors: [
    '[data-automation-id="file-upload-input-ref"]',
    'input[data-automation-id="file-upload-input-ref"]',
    'input[type="file"][data-automation-id*="file" i]',
  ],
  fieldKeys: {},
  automationIds: {
    legalNameSection_firstName: 'first_name',
    legalNameSection_lastName: 'last_name',
    email: 'email',
    emailAddress: 'email',
    'phone-number': 'phone',
    phoneNumber: 'phone',
    countryDropdown: 'country',
    countryPhoneCode: 'skip',
    linkedinQuestion: 'linkedin',
    linkedInQuestion: 'linkedin',
    website: 'website',
  },
}

const GENERIC: BoardAdapter = {
  kind: 'generic',
  hosts: [],
  formRootSelectors: ['form#application-form', 'form[action*="apply"]', '#application_form'],
  applyFieldSelectors: [
    'form#application-form',
    'form[action*="apply"]',
    '#application_form',
    'input[name="first_name"]',
    'input[name="resume"]',
    'input[type="file"][name*="resume" i]',
  ],
  postingSelectors: [
    '#content',
    '.job__description',
    '[data-job-description]',
    '.job-description',
    '[data-qa="job-description"]',
    '.posting-page',
  ],
  submitSelectors: [],
  continueSelectors: [],
  resumeInputSelectors: ['input[type="file"][name*="resume" i]', 'input[name="resume"]'],
  fieldKeys: {},
  automationIds: {},
}

const BOARDS: BoardAdapter[] = [GREENHOUSE, LEVER, ASHBY, WORKDAY]

/** Distinctive ATS keys applied on any host (custom career domains included). */
const DISTINCTIVE_KEYS: Record<string, FieldKind> = {}
const DISTINCTIVE_AUTOMATION: Record<string, FieldKind> = {}
for (const board of BOARDS) {
  Object.assign(DISTINCTIVE_KEYS, board.fieldKeys)
  Object.assign(DISTINCTIVE_AUTOMATION, board.automationIds)
}

export function detectBoard(hostname: string): BoardKind {
  const host = hostname.toLowerCase()
  for (const board of BOARDS) {
    if (board.hosts.some(h => host === h || host.endsWith(`.${h}`) || host.includes(h))) {
      return board.kind
    }
  }
  return 'generic'
}

export function getBoardAdapter(hostname: string): BoardAdapter {
  const kind = detectBoard(hostname)
  return BOARDS.find(b => b.kind === kind) ?? GENERIC
}

export function applyFormSelectorList(hostname = ''): string {
  const adapter = getBoardAdapter(hostname)
  const extra = adapter.kind === 'generic' ? BOARDS.flatMap(b => b.applyFieldSelectors) : adapter.applyFieldSelectors
  return [...new Set([...GENERIC.applyFieldSelectors, ...extra])].join(', ')
}

export function postingSelectorList(hostname = ''): string {
  const adapter = getBoardAdapter(hostname)
  const extra = adapter.kind === 'generic' ? BOARDS.flatMap(b => b.postingSelectors) : adapter.postingSelectors
  return [...new Set([...GENERIC.postingSelectors, ...extra])].join(', ')
}

export function distinctiveSubmitSelectors(): string[] {
  return [...new Set(BOARDS.flatMap(b => b.submitSelectors))]
}

export function distinctiveContinueSelectors(): string[] {
  return [...new Set(BOARDS.flatMap(b => b.continueSelectors))]
}

export function distinctiveResumeSelectors(): string[] {
  return [...new Set([...BOARDS.flatMap(b => b.resumeInputSelectors), ...GENERIC.resumeInputSelectors])]
}

/**
 * Map a control onto a FieldKind using ATS-specific name / automation ids.
 * Returns null when this adapter has no opinion (caller falls back to heuristics).
 */
export function classifyBoardField(
  meta: { name: string; id: string; automationId?: string },
  board: BoardKind = 'generic',
): FieldKind | null {
  const automation = (meta.automationId || '').trim()
  if (automation) {
    const hit = DISTINCTIVE_AUTOMATION[automation] ?? DISTINCTIVE_AUTOMATION[key(automation)]
    if (hit) return hit
  }

  const nameKey = key(meta.name)
  const idKey = key(meta.id)
  if (nameKey && DISTINCTIVE_KEYS[meta.name.toLowerCase()]) return DISTINCTIVE_KEYS[meta.name.toLowerCase()]
  if (idKey && DISTINCTIVE_KEYS[meta.id.toLowerCase()]) return DISTINCTIVE_KEYS[meta.id.toLowerCase()]
  if (nameKey && DISTINCTIVE_KEYS[nameKey]) return DISTINCTIVE_KEYS[nameKey]
  if (idKey && DISTINCTIVE_KEYS[idKey]) return DISTINCTIVE_KEYS[idKey]

  if (board === 'lever' && (nameKey === 'name' || idKey === 'name')) return 'full_name'
  if (board === 'ashby' && (nameKey === 'name' || idKey === 'name')) return 'full_name'

  return null
}
