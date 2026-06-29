# 08 — v1 Product Specification

> **The contract for v1.** If it's not here (or in `01-decisions.md`), it's not v1.
> Last updated: 2026-06-14

## v1 in one sentence

Bring your own job → we tailor the best honest resume + cover letter from your master profile → you apply manually with a masked email → we track status and show every version with a clear diff.

## v1 does

| Capability | Decision | Detail doc |
|------------|----------|------------|
| Master profile (source of truth) | Q1 | `02-data-model.md` |
| Sprout-style sectioned profile editor | — | `10-screens-and-ia.md` |
| Upload up to 3 resumes (seed profile) | Q20–Q22 | `09-user-flows.md` |
| Bring-your-own job (paste/link JD) | Q27 | `09-user-flows.md` |
| Two-judge tailoring engine | Q4–Q8 | `03-tailoring-engine.md` |
| Gap questions → write-back suggestions | Q2, Q6 | `03-tailoring-engine.md` |
| Bullet-level provenance + history | Q3, Q10–Q11 | `02-data-model.md` |
| Layered review (nudge, notifications, badges) | Q12–Q13 | `10-screens-and-ia.md` |
| Job tracker dashboard | Q23 | `10-screens-and-ia.md` |
| Per-job detail (2-pane layout) | Q24–Q25 | `10-screens-and-ia.md` |
| Document panel: versions + change summary | Q34 | `10-screens-and-ia.md` |
| Regenerate cap (e.g. 3 per job) | Q34 | `10-screens-and-ia.md` |
| Export PDF + DOCX (same template) | Q26 | `09-user-flows.md` |
| Masked email for application tracking | Q32 | `11-email-tracking.md` |
| Dual light/dark theme | Q16–Q18 | `04-ui-theme.md` |
| Google sign-in (basic scope only) | Q29 | `11-email-tracking.md` |

## v1 does NOT

| Capability | When | Doc |
|------------|------|-----|
| Job search / swipe-to-apply | v2 | `07-v2-backlog.md` |
| Auto-apply (agent fills forms) | v2 | `07-v2-backlog.md` |
| Gmail read / inbox scraping | Not planned (masked inbox instead) | `11-email-tracking.md` |
| LinkedIn outreach, company timeline | v2 | `07-v2-backlog.md` |
| Credit billing / subscriptions | v2 (reference model in Q33) | `12-sprout-research.md` |
| Standalone Resumes nav page | Removed — uploads live in Profile | Q19 |

## The three pillars of v1

### 1. Profile is the resume

Everything career-related lives in `profiles.profile_data`. Uploaded files are **inputs** that seed or diff into the master — not parallel sources of truth. Tailoring always reads the master.

### 2. Tailoring is the product

The engine must pass two judges (ATS + human recruiter), ask before inventing, reframe honestly, restructure for the role, and produce a **structured diff** the UI can show. Quality here is the moat.

### 3. Jobs are the hub

After tailoring, the **job** is the container: fit score, documents (versioned resume + cover letter), questions asked/answered, application status, email events, and (when applicable) portal credentials.

## Status model (per job)

Two independent status axes:

### Tailoring status (derived)

| State | Meaning |
|-------|---------|
| `not_started` | Job saved, no tailor run yet |
| `needs_questions` | Gap questions generated, user hasn't answered |
| `needs_review` | Tailored docs ready; user should review before applying |
| `ready` | User marked docs good / exported |
| `stale` | Master profile changed since last tailor — suggest regenerate |

### Application status (manual + email-derived)

| State | Source |
|-------|--------|
| `not_applied` | Default |
| `applied` | User sets, or we detect confirmation email |
| `in_progress` | Portal account created / partial apply (v2 prep) |
| `interview` | Email parse or user sets |
| `rejected` | Email parse or user sets |
| `offer` | Email parse or user sets |
| `withdrawn` | User sets |

Email-derived updates **suggest** status changes; user can override.

## Document versioning (per job)

- Each tailor or regenerate creates a new **version** (v1, v2, v3…).
- Cap: **3 regenerations** per job per document type (configurable).
- Latest version is default; user can switch versions in the document panel.
- Each version stores: `structured_data`, `changes[]`, scores, `created_at`, optional user edits flag.
- **Change summary** shows added / changed / removed vs master profile at generation time.

## Success criteria for v1 launch

1. User can build a complete profile (upload or manual) and see completeness badges.
2. User can add a job, get a fit score, answer gap questions, receive tailored resume + cover letter.
3. User can see **what changed** vs their master profile, regenerate up to cap, export PDF + DOCX.
4. User can copy a masked email, apply manually, and see application emails reflected on the job timeline.
5. User can accept write-back suggestions into master with visible provenance.
6. Light and dark themes work on all primary screens.

## Build sequence (dependency order)

```
Phase 1 ✅  Profile-as-master + theme
    ↓
Phase 2     Tailor engine (must produce good diffs + gap suggestions)
    ↓
Phase 3     Write-back + provenance (needs engine output)
    ↓
Phase 4     Notifications + badges (needs pending suggestions)
    ↓
Phase 5     Job tracker + document panel + masked inbox + exports
    ↓
Final       Cross-theme polish
```

Phase 5 **UI shell** can be stubbed early, but the document panel's change summary needs Phase 2's `changes` contract.

## Open questions (not blocking docs; decide before build)

| # | Question | Options |
|---|----------|---------|
| O1 | Masked email provider | Resend inbound, Mailgun, Postmark, custom domain |
| O2 | Regenerate cap | 3 total vs 3 per doc type (resume vs cover letter) |
| O3 | `tailored_resumes` versioning | New row per version vs `version` column on same job FK |
| O4 | Cover letter versions | Same version number as resume or independent |

_Default assumptions documented in `02-data-model.md`: new row per version; cover letter version tied to same tailor run._
