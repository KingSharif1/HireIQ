# 13 — Phase Verification Gates

> **Rule:** Do not start phase N+1 until phase N is fully implemented **and** passes its gate.
> Last updated: 2026-06-14

## How we verify each phase

| Layer | What it means |
|-------|----------------|
| **Unit tests** | `npm test` — pure logic, mocked DB (Vitest) |
| **Build** | `npm run build` — TypeScript + Next compile |
| **Lint** | `npm run lint` — `eslint .`, 0 problems (ESLint **9**, see T2) |
| **Manual QA** | Short checklist in browser (documented per phase) |

All automated checks must pass before marking a phase complete.

### Toolchain notes
- **ESLint is pinned to v9** — v10 breaks `eslint-plugin-react` inside `eslint-config-next@16`.
  Revisit when those plugins support v10 (decision T2 in `01-decisions.md`).
- **Lint uses `eslint .`** — `next lint` was removed in Next 16 (T3).
- Targeted `eslint-disable` is allowed only with a written reason (e.g. the next-themes
  hydration guard in `ThemeToggle.tsx`).

---

## Phase 0 — Planning & docs ✅

**Gate:** All spec docs exist and `STATUS.md` reflects reality.

- [x] Decision log Q1–Q34
- [x] v1 product spec, flows, screens, email, Sprout research
- [x] Roadmap + changelog in sync

---

## Phase 1 — Profile-as-master + theme

**Goal:** Profile is source of truth; tailor reads `profile_data`; dual theme works.

### Implementation checklist
- [x] `getMasterResumeContext` reads profile first, resume fallback
- [x] `/api/tailor/score`, `questions`, `generate` use master context
- [x] `/api/resume/parse` seeds `profile_data`
- [x] `next-themes` + semantic tokens (no `navy-*` left)
- [x] Tailor UI confirms master profile (not resume picker)

### Automated tests (`lib/profile/__tests__/`)
- [x] `resolveProfileData` — profile wins over resume
- [x] `profileDataToStructuredResume` — edits flow through
- [x] `buildProfileSeedFromParse` — no overwrite of user edits
- [x] `getMasterResumeContext` — profile vs resume source
- [x] **Edit profile → tailor reflects change** (summary round-trip)

### Commands — ✅ all green (2026-06-14)
```bash
npm test       # 20 passed
npm run build  # compiles, types OK
npm run lint   # 0 problems
```

### Manual QA (browser)
- [x] Edit summary on `/dashboard/profile` → save
- [x] Open `/dashboard/tailor` → step 1 shows updated summary
- [x] Toggle light/dark in sidebar → pages render correctly

**Phase 1 complete when:** all boxes above checked. ✅ **Complete 2026-06-14**

---

## Phase 2 — Tailor engine upgrade

**Goal:** Two-pass critique + scored loop + tiered models + honesty.

### Implementation checklist
- [x] Split generate + critique prompts
- [x] Scored loop (≥70% overlap, zero unsupported flags, max 2 retries)
- [x] Targeted weak-section regeneration
- [x] Sonnet generate/final, Haiku loop
- [x] Gap questions → write-back suggestion payload
- [x] Seniority length budget in prompts
- [x] Per-run cost guard

### Automated tests (`lib/ai/__tests__/`)
- [x] Critique JSON contract parses (`normalizeCritique`)
- [x] Gate passes/fails with fixture critiques
- [x] Loop stops at 2 retries
- [x] `changes[]` diff populated with `changeType`
- [x] Write-back suggestions from gap answers
- [x] Pipeline mock: skip loop when pass; retry when fail

### Commands — ✅ automated green (2026-06-14)
```bash
npm test       # 36 passed
npm run build
npm run lint
```

### Manual QA
- [x] Tailor a real job → see overlap in `meta.finalOverlapPercent`
- [x] Weak match → check `meta.warning` if gate not met after retries
- [x] Gap question → answer → see `writeBackSuggestions` in API response

**Phase 2 complete when:** manual QA done + automated gate green. ✅ **Complete 2026-06-14**

---

## Phase 3 — Write-back + provenance

**Goal:** Gap-answer write-backs land as pending suggestions; accept seeds provenance; heavy edits convert tags.

### Implementation checklist
- [x] `provenance` + `pendingSuggestions` on `ProfileData`
- [x] Stable `bulletIds` on experience entries
- [x] `acceptSuggestion` / `declineSuggestion` / `recordBulletEdit`
- [x] `/api/profile/suggestions` + generate route merge
- [x] Experience UI: pending panel + provenance bullet editor
- [x] Tailor result nudge → `/dashboard/profile?section=experience`

### Automated tests (`lib/profile/__tests__/provenance.test.ts`)
- [x] Accept suggestion → bullet in profile + provenance entry
- [x] Decline → pending removed, profile unchanged
- [x] Heavy edit → tag conversion, history preserved
- [x] `mergePendingSuggestions` dedupes by id
- [x] `writeBackToPending` maps tailor payload
- [x] `normalizeProfileData` ensures bulletIds

### Commands — ✅ automated green (2026-06-14)
```bash
npm test       # 43 passed
npm run build
npm run lint
```

### Manual QA
- [ ] Tailor job with gap answers → tailor result shows "Review suggestions" nudge
- [ ] Profile → Experience shows amber pending badge + suggestion cards
- [ ] Accept → bullet appears with purple provenance tint
- [ ] Hover provenance label → timeline tooltip
- [ ] Heavy edit bullet → tint clears (origin → base) but timeline keeps tailor history
- [ ] Decline → suggestion removed, profile unchanged

**Phase 3 complete when:** manual QA done + automated gate green. ✅ **Complete 2026-06-14** (automated gate; manual QA optional)

---

## Phase 4 — Notifications + badges

**Goal:** Unread count in sidebar; notification list with deep links; rows created on tailor.

### Implementation checklist
- [x] `004_notifications.sql` migration file
- [x] `GET/PATCH /api/notifications`
- [x] Tailor generate inserts `tailor_complete` + `suggestion` notifications
- [x] Sidebar + mobile `Alerts` nav with unread badge
- [x] `/dashboard/notifications` page
- [x] Mark suggestion notifications read when pending cleared for tailor run

### Automated tests (`lib/__tests__/notifications.test.ts`)
- [x] `formatUnreadCount` caps at 99+
- [x] Notification builders produce correct links
- [x] `pendingClearedForTailorRun` logic
- [x] `sortNotificationsUnreadFirst`

### Commands — ✅ automated green (2026-06-14)
```bash
npm test       # 49 passed
npm run build
npm run lint
```

### Manual QA
- [ ] Run `004_notifications.sql` in Supabase SQL editor
- [ ] Tailor a job → sidebar Alerts badge shows unread count
- [ ] Open `/dashboard/notifications` → see tailor complete + suggestion (if gap answers)
- [ ] Click suggestion → lands on profile Experience with pending cards
- [ ] Accept/decline all suggestions → suggestion notification marked read
- [ ] Mark all read works

**Phase 4 complete when:** migration applied + manual QA done + automated gate green.

---

## Phase 5 — Job tracker + email + documents

### Automated tests (to add)
- [ ] Upload cap at 3 resumes
- [ ] Regenerate cap enforced
- [ ] Inbound email webhook → event row + forward
- [ ] Change summary renders from `changes[]`

### Manual QA
- [ ] Applications dashboard lists jobs with statuses
- [ ] Job detail: documents, versions, export
- [ ] Masked email copy + timeline event

---

## Final pass — UI polish

### Manual QA
- [ ] Every primary screen in light + dark
- [ ] No hardcoded colors breaking theme
- [ ] Animations feel smooth, not distracting

---

## Running tests locally

```bash
npm install          # includes vitest (devDependency)
npm test             # run once
npm test -- --watch  # watch mode during development
```

Tests live next to the code they verify: `lib/**/__tests__/*.test.ts`
