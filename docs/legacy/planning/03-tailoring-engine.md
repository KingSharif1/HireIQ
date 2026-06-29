# 03 — Tailoring Engine

The core "gets interviews" system. Holistic, evidence-driven, honest.

## Goals (the two judges)

Every tailored resume must satisfy **both**:
1. **The ATS** — keyword/language overlap with the JD, clean parseable structure, standard
   headers, right section order.
2. **A skeptical human recruiter** — clear, credible, specific, not robotic, every claim
   believable and supported.

## Pipeline (Q4 = A + C: two-pass critique + scored loop)

```
Input: master profile_data + job extracted_data + user's gap answers

Pass 1 — GENERATE (strong model / Sonnet)
  • Pull every phrase the company uses to describe success.
  • Map each to the candidate's closest REAL evidence (from profile + gap answers).
  • Rewrite bullets in the company's exact language (truthful re-expression).
  • Restructure: reorder sections + bullets, drop/merge weak bullets, trim to budget.

Pass 2 — SELF-CRITIQUE (cheap model / Haiku for the loop)
  • Re-read the draft as an ATS parser  → compute language-overlap %.
  • Re-read the draft as a skeptical human recruiter → flag:
      - unsupported / exaggerated claims
      - vague or generic bullets
      - robotic / AI-sounding phrasing
  • Produce a critique report.

SCORE + GATE (Q5 = Balanced)
  • PASS if: overlap ≥ 70%  AND  zero unsupported-claim flags.
  • If fail: regenerate ONLY the weak sections (targeted), then re-score.
  • Max 2 retries. Then return best attempt; if still short, attach a warning.

Final critique pass uses the strong model (quality where it matters — Q14).

Output: tailored structured_data + scores + tailoring_notes + any new-info suggestions
```

## Honesty spine (Q6 = A + C)

- **Real gap, no evidence → ASK, never invent.** Surface a gap question ("Have you done
  X?"). If yes → becomes real evidence and a write-back suggestion. If no → leave it out.
- **Has evidence but weak → REFRAME.** Power up the wording using the role's language.
  No new claims — only stronger, clearer expression of what's true.
- Hard rule: **never fabricate, never exaggerate.** Unsupported-claim flags block the gate.

## Restructure rules (Q7 = full restructure, Q8 = seniority length)

- Reorder bullets (most relevant first) and skills (most relevant first).
- Reorder sections for the role (e.g. Projects above Education for a dev role).
- Drop/merge genuinely weak or irrelevant bullets **in the tailored snapshot only** — the
  master keeps everything.
- **Length budget:** 1 page for junior/mid, up to 2 pages for senior/lead/staff/principal,
  from detected `seniority`.
- **Content-driven (Q8b):** budget is a prioritization tool, not a quota. Never pad to
  fill; never cut strong relevant content just to hit a number.

## Cost / models (Q14 = tiered)

| Step | Model | Why |
|------|-------|-----|
| Pass 1 generate | Sonnet (`claude-sonnet-4-*`) | Quality of the actual rewrite matters most |
| Pass 2 scoring/critique loop | Haiku (cheap) | Runs potentially multiple times; keep it cheap |
| Final critique | Sonnet | Last quality gate before showing the user |

- Hard retry cap (2) bounds worst-case cost.
- Skip the loop entirely if Pass 1 already passes the gate.
- **Reminder:** the Anthropic account previously hit "credit balance too low." Keep an eye
  on spend; consider a per-run call budget.

## Scoring detail

- **Language overlap %**: share of JD success-phrases / required keywords credibly present
  in the tailored resume. Gate ≥ 70%.
- We also keep the existing deterministic `calculateATSScore` (`lib/scoring/ats-scorer`)
  for the before/after match score shown in the UI — complementary to the AI overlap %.

## Prompts to build/upgrade (`lib/ai/prompts.ts`)

- `RESUME_TAILOR_PROMPT` → split into **generate** + **critique** prompts (currently one
  pass).
- New: `TAILOR_CRITIQUE_PROMPT` (ATS + human dual review, returns overlap % + flags).
- `QUESTION_GENERATOR_PROMPT` → ensure gap questions feed the honesty/ask-first loop and
  produce write-back suggestions on answer.
- Keep `extractJSON` helper.

## Open implementation notes

- ~~Need a stable section-weak-spot identifier~~ → `weak_sections` in critique JSON (`experience:expId`).
- ~~Decide JSON contract for critique report~~ → `TailorCritiqueReport` in `lib/ai/tailor-types.ts`.
- Implemented in `lib/ai/tailor-engine.ts` (pure logic) + `lib/ai/tailor-pipeline.ts` (orchestration).
- API route: `app/api/tailor/generate/route.ts` returns `meta`, `writeBackSuggestions`, `changeType` on diffs.
