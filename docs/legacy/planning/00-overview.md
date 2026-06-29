# 00 — Product Overview

## What HireIQ is

An AI job-application tool that turns a person's real experience into resumes that
**clear ATS filters AND earn interviews from humans** — without lying or generic
keyword-stuffing. Inspired structurally by Sprout (usesprout.com).

## The core problem

You can be genuinely qualified and still get filtered out before a human sees you —
not because you lack the experience, but because your resume doesn't use the same
vocabulary as the job description. ATS systems pattern-match; they don't read like a
person. If your resume says "built web services" but the JD says "RESTful API
development with microservices," you're invisible.

**The fix is not to lie or pad** — it's to surface and re-express what you actually did
in the language that matters for the target role.

## Guiding philosophy (from the Sabrina Ramonov prompt-chain reference)

1. Pull every phrase the company uses to describe success; map them to the closest real
   bullet points.
2. Rewrite bullets in the company's exact language — **optimize how you describe it,
   don't lie about what you did.**
3. Score language overlap as a %; flag anything weak.

HireIQ productizes this loop with a holistic, evidence-driven engine and a human-quality
check on top of the ATS check.

## Who it's for

Job seekers applying at volume who want each application tailored and credible without
spending 10 minutes hand-editing per role.

## North-star principles

- **Truth first.** Never fabricate. Real gaps stay gaps (we ask, we don't invent).
- **Profile is the master.** One source of truth; everything flows from it.
- **Two judges, always.** Every tailored resume must satisfy the ATS *and* a skeptical
  human recruiter.
- **The user stays in control.** Suggestions, not silent changes. Review before merge.
- **Traceable.** Anything added from a tailored resume is visibly marked and has a
  history.

## v1 scope (summary)

See **`08-v1-product-spec.md`** for the full contract. In short:

1. **Profile** — master career record (Sprout-style sections + uploads seed it).
2. **Tailor** — best-in-class honest tailoring with diff + versions per job.
3. **Applications** — job tracker, document panel, masked email tracking.
4. **Not v1** — job search, auto-apply, credits/billing (see `07-v2-backlog.md`).

## Reference points

- **Sprout** (`app.usesprout.com`) — structural inspiration for the profile (sectioned
  nav: PROFILE / DOCUMENTS / PROFESSIONAL PROFILE with count badges). NOTE: the app is
  behind a login wall; we have only seen a DOM snippet the user pasted + the public
  marketing site. Not a verified pixel reference.
- **Sabrina Ramonov note** — the 3-prompt language-overlap tailoring chain.
