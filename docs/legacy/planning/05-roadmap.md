# 05 — Roadmap & Status

> Build order from Q15 (foundation first) + Q18 (theme tokens early, polish last).
> Update the checkboxes as work lands. Keep `06-changelog.md` in sync.

## Phase 0 — Planning & docs
- [x] grill-me decision session
- [x] `_docs/` created (git-ignored)
- [x] Decisions, data model, engine, theme documented
- [x] Full v1 product spec (`08-v1-product-spec.md`)
- [x] User flows (`09-user-flows.md`)
- [x] Screens & IA (`10-screens-and-ia.md`)
- [x] Email tracking spec (`11-email-tracking.md`)
- [x] Sprout research (`12-sprout-research.md`)
- [x] Status snapshot (`STATUS.md`)

## Phase 1 — Profile-as-master foundation
**Goal:** Profile becomes the true source of truth; Tailor reads from `profile_data`.
- [x] Audit every read of `resumes.structured_data` in the tailor flow
- [x] Point `/api/tailor/*` at `profile_data` (fall back to latest resume if profile empty)
- [x] Upload/parse → seed `profile_data` (not just create a resume row)
- [x] Ensure `resolveProfileData` seeding stays correct
- [x] Theme foundation: dual tokens + `next-themes` ThemeProvider + toggle (Q18)
- [x] Migrate hardcoded `navy-*` usages → semantic tokens
- [x] Verify: edit profile → tailor reflects the change (unit tests + `13-phase-verification.md`)
- [x] Manual QA: profile save → tailor step 1 + theme toggle (browser — user verified 2026-06-14)

## Phase 2 — Tailor engine upgrade
**Goal:** two-pass critique + scored loop + honesty + restructure + tiered models.
- [x] Split `RESUME_TAILOR_PROMPT` into generate + critique prompts
- [x] Add `TAILOR_CRITIQUE_PROMPT` (ATS overlap % + human flags, JSON contract)
- [x] Implement scored loop with balanced gate (≥70% + zero unsupported flags, max 2 retries)
- [x] Targeted regeneration of weak sections only
- [x] Wire tiered models (Sonnet generate/final, Haiku loop)
- [x] Honesty: gap-question ask-first path → produces write-back suggestions
- [x] Restructure + seniority length budget
- [x] Per-run cost guard (credit-limit awareness)
- [x] Manual QA: tailor a real job end-to-end (browser + Anthropic key)

## Phase 3 — Write-back + provenance
**Goal:** suggestions merge into master with bullet-level provenance + history.
- [x] `provenance` sidecar map + `pendingSuggestions` in `ProfileData` (types)
- [x] Stable bullet ids on experience entries (`lib/profile/bullets.ts`)
- [x] Accept/Decline logic (`lib/profile/provenance.ts` + `/api/profile/suggestions`)
- [x] Provenance coloring + hover timeline UI (Experience — `ProvenanceBulletEditor`)
- [x] Tag-conversion-on-heavy-edit (Q10) while preserving history (Q10b)
- [x] Generate route merges `writeBackSuggestions` → `pendingSuggestions`
- [x] Profile deep link `?section=experience` from tailor result nudge
- [ ] Projects/volunteering provenance editor (deferred — Experience first)

## Phase 4 — Notifications + badges
**Goal:** the layered review surface.
- [x] `notifications` table + RLS (migration `004_notifications.sql`)
- [x] Post-tailor notifications (`tailor_complete` + `suggestion` when write-backs exist)
- [x] Sidebar + mobile unread badge (Sprout-style `99+` cap)
- [x] `/dashboard/notifications` list with mark-read + deep links
- [x] Suggestion notifications auto-mark-read when all pending for a tailor run cleared
- [x] Per-section badges in profile nav (Experience pending count — amber badge)
- [x] Inline pre-filled preview + "why" message + Accept/Decline (`PendingSuggestionsPanel`)
- [ ] Manual QA after migration applied

## Phase 5 — Resume management + job tracker (grill batch 2–4)
**Goal:** profile owns uploads; jobs get a real home; documents + email tracking ship in v1.
- [x] Remove "Resumes" + "Jobs" from main nav (Q19) — routes kept, Profile/Documents + Add job
- [x] Applications dashboard shell at `/dashboard` (job cards, fit %, add job CTA)
- [x] Delete resume (`DELETE /api/resume/[id]`)
- [x] Job tracker dashboard at `/dashboard`: derived tailoring status + manual application status (Q23)
- [x] Per-job detail page (2-pane): details, fit score, documents, Q&A area (Q24, Q25)
- [x] Document preview = WYSIWYG of exported PDF (`ResumePreview`)
- [x] Document versions (v1/v2…) via `tailored_resumes.version` + dropdown
- [x] Exports: PDF + DOCX from job hub (Q26)
- [ ] Change summary vs master in Documents tab (reuse `TailorDiff`)
- [ ] Regenerate cap 3 enforcement (Q34)
- [ ] Upload soft-cap of 3 + prune oldest (Q20)
- [ ] **Masked inbox (Q32):** per-user alias email, copy-for-apply UI, inbound parse, timeline
- [ ] Application credentials storage (v2 prep) (Q31)

## Final pass — UI polish
- [ ] Deep per-page polish in both themes (dashboard, profile, tailor, resume, auth)
- [ ] Micro-animations (section transitions, hovers, counters)
- [ ] Cross-theme QA on every page

## v2 backlog
See `07-v2-backlog.md` — job search, auto-apply (email tracking + document versions are v1).

## Legend
⬜ not started · 🟡 in progress · ✅ done
