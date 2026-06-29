# 07 — v2 Backlog

> Features intentionally deferred past v1. v1 = **bring-your-own job → best-in-class tailoring
> → masked email tracking → interview**.
> Each links back to a decision in `01-decisions.md`.

## GitHub integration (Q39)
- **Goal:** connect a user's GitHub so HireIQ can read their repos and keep the master profile /
  projects fresh — "auto-update the resume" from real work.
- **Shape:** GitHub OAuth (read-only `repo`/`read:user`) → pull repos (name, description, languages,
  topics, stars, recent commit activity, README) → an analysis pass infers project bullets + skills →
  surfaced as **pending suggestions** (reusing the existing write-back/provenance flow), never silently
  written.
- **Why v2:** OAuth app + token storage + rate limits + an analysis pipeline is its own milestone;
  kept out of the v1 UI pass.
- **Reuses:** `pendingSuggestions` + provenance (Q2/Q3) so GitHub-sourced bullets get a badge and
  user review, exactly like tailor suggestions.

## Job search (Q27)
- v1 is bring-your-own job (paste/link). v2 adds a job search/discovery surface so users
  don't have to leave the app to find roles.

## Auto-apply (Q30)
- **Sprout pattern (researched):** an AI agent opens the employer's application page,
  detects fields, fills them from the master profile/resume, answers screening questions,
  and submits. The masked inbox (Q32) catches verification codes and magic links.
- **Credit cost (Q33):** **1 credit** = standard applications; **3 credits** = Workday,
  CAPTCHA, or multi-step forms — shown on the job card before apply. Not resume length.
- We'd build this as **agentic browser automation** over the user's master profile.
- **Application Credentials (Q31):** when a portal requires an account, Sprout creates one
  with the user's `@whisperpost.io` email + generated password, saves it, and shows it in
  the job detail view. No password resets on existing accounts — collision avoided by masked email.

## Auth scope path (Q29)
- **Now:** Google sign-in requests basic profile + email only (no inbox).
- **Email tracking does NOT need Gmail read** — we use our own masked inbox (Q32), same as Sprout.
- Gmail read remains optional future enhancement only if we want zero-behavior-change tracking
  (would trigger Google's restricted-scope CASA audit).

## Outreach & richer panes (Q25)
- v1 keeps a 2-section layout. v2 can add the third pane (LinkedIn outreach, company
  timeline, etc.) once the core tailoring loop is polished.

## Moved to v1 (no longer v2)
- **Email tracking (Q32)** — masked inbox, opt-in, parse + forward
- **Tailored document versions + change summary (Q34)** — per-job document panel
