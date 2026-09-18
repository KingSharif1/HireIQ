# Tailor quality — Claude bake-off + improvement plan

**Date:** 2026-09-17  
**Job:** Emerson Software Engineer ([Oracle CX `26010937`](https://hdjq.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/26010937))  
**Compare:** HireIQ draft-first (Task 162) vs Claude chat artifact (DOCX) for the same candidate + JD.

Screenshots / artifacts: `.ui-audit/` (gitignored). Claude artifact was opened in-product as “Sharif ahmed emerson softwareengineer”.

---

## Verdict

**Claude wins this bake-off.** HireIQ’s draft is honest and usable (~50% ATS, web/Agile framing). Claude’s is better *aimed* at this posting: hardware-led thesis, Mapping Robot as a first-class section, and **no** coursework C++ pretending to close a proficiency gap.

HireIQ already has the right *spine* (master profile, draft-first, honesty, 2-call ceiling). Quality gap is **selection + thesis + skill honesty + JD thickness**, not “need another rewrite model.”

---

## Side-by-side (Emerson)

| Dimension | HireIQ | Claude |
|-----------|--------|--------|
| Framing | Cross-functional / Agile / web story | Fast learner + **shipped hardware software** |
| Lead project | NEMT / Cowboy Cards style web work | **Mapping Robot** (Pi / LiDAR / ROS 2) elevated |
| C++ | Surfaced as coursework in summary/skills | **Left off** — treated as unmet proficiency |
| Structure | Experience-forward | Hardware project elevated; SaaS after |
| JD input | Thin Oracle scrape (“vague JD”) | Full JD pasted by user |
| Honesty | No invented drivers/RTOS | Same + explicit C++ gap |
| UX | Score + leftover chips (some weak) | Artifact DOCX, no chip noise |

### What HireIQ got right
- Draft before quiz (Task 162)
- Did not invent kernel/driver work
- Mentions collaboration / Agile honestly
- One-page preview is clean

### What Claude did that we should copy
1. **Thesis-first restructure** for *this* JD (embedded/hardware), not generic “software engineer.”
2. **Project promotion by domain**, not only keyword hit counts (web SaaS lost to Mapping Robot).
3. **Proficiency gate** — coursework ≠ job-required C++.
4. **Thick JD** — full responsibilities/skills text, not a thin title+blurb scrape.

---

## How to make HireIQ tailoring better

Ordered by impact vs cost. Stay inside the **max 2 Claude calls** ceiling unless we explicitly revisit that decision.

### P0 — Fix inputs and honesty (highest leverage)

| # | Change | Why | Likely code |
|---|--------|-----|-------------|
| 1 | **Thicker Oracle / generic JD fetch** | Thin `extracted_data` → weak thesis + nonsense chips (“Software development?”) | `lib/jobs/job-scraper.ts`, analyze prompt, Playwright fallback for Oracle CX |
| 2 | **Skill confidence / source tags** | Don’t promote `coursework` / `familiar` skills as if they close `required` gaps | Profile skills schema + `prompts.ts` + ATS gap hints |
| 3 | **Domain-aware project ranking** | Keyword `job-relevance.ts` under-ranks hardware projects when JD tokens are sparse/thin | `lib/tailor/job-relevance.ts` + optional embedding / thesis tags from analyze |

### P1 — Claude-quality structure in one draft call

| # | Change | Why | Likely code |
|---|--------|-----|-------------|
| 4 | **Explicit thesis object in analyze** | Store `role_thesis`, `domain_tags` (embedded, web, controls…) on the job | Job analyze → `extracted_data` |
| 5 | **Prompt: proficiency vs exposure** | “Never list a skill as proficiency if evidence is coursework-only when JD requires professional use” | `lib/ai/prompts.ts` |
| 6 | **Pre-select top projects in code** | Pass ranked project IDs + why into the draft prompt (don’t leave all selection to the model) | `execute-run.ts` + `job-relevance.ts` |
| 7 | **Chip quality gate** | Skip chips that aren’t concrete tools/skills (drop “Software development”) | leftover-chip filter in execute-run / continue |

### P2 — Optional quality loop (cost tradeoff)

| # | Change | Why | Note |
|---|--------|-----|------|
| 8 | **Cheap Haiku critique pass** | Flag unsupported claims + wrong lead project before `needs_review` | Spec’d in `docs/legacy/planning/03-tailoring-engine.md`; would be call #2 *or* replace weave |
| 9 | **Paste-JD override UX** | When scrape is thin, one “paste full posting” before/after draft | Beats bad Oracle HTML |

**Do not** chase Teal-style keyword stuffing. Bar stays: ATS + skeptical human, same voice, never invent.

---

## GitHub related projects (first survey — 2026-09-17)

**We had not surveyed open-source tailor repos before this write-up.** Prior “GitHub” work in HireIQ is **our OAuth + repo intelligence** (`docs/GITHUB.md`), not competitor research.

| Repo | Stars (approx) | What they do well | Steal for HireIQ? |
|------|----------------|-------------------|-------------------|
| [srbhr/Resume-Matcher](https://github.com/srbhr/Resume-Matcher) | ~28k | Master resume → per-JD tailor; local + multi-LLM; match score + keywords | UX pattern (master + tailor). We already have this product shape. |
| [javiera-vasquez/claude-code-job-tailor](https://github.com/javiera-vasquez/claude-code-job-tailor) | ~170 | **Weighted JD requirements** → auto-select achievements from YAML | **Yes** — weighted reqs + achievement pick before rewrite |
| [olegvg/resume-tailor-plugin](https://github.com/olegvg/resume-tailor-plugin) | Claude skill | Gap table → strategic Qs → ATS draft → DOCX | Gap table + locale; we moved Qs *after* draft (keep that) |
| [nishilbhave/ats-resume-tailor](https://github.com/nishilbhave/ats-resume-tailor) | Claude skill | Multi-agent pipeline; `/resume compare` across JDs | Compare-matrix later; multi-agent too heavy for 2-call budget |
| [varunr89/resume-tailoring-skill](https://github.com/varunr89/resume-tailoring-skill) | Claude skill | Confidence-scored content match; experience discovery interviews | Confidence scores for skill/project include |
| [NayanshiSingh/OneResume](https://github.com/NayanshiSingh/OneResume) | smaller | **Embeddings** for project/experience ranking; rules for section order | **Yes** — semantic rank to fix Mapping Robot vs web |
| [shivtchandra/Resumit](https://github.com/shivtchandra/Resumit) | smaller | ATS diagnose + **GitHub repo rank for role** | Aligns with our Task 164 intel → feed into tailor ranking |

### Takeaways from OSS (not product clones)
1. **Weighted requirements + pre-select content** (claude-code-job-tailor, OneResume) beat “dump whole master + hope Sonnet ranks.”
2. **Semantic / domain similarity** beats bag-of-tokens when JD scrape is thin.
3. Multi-agent Claude skills are quality references, not our runtime — we stay productized + 2-call.

---

## Acceptance bar for “Claude-quality” on Emerson-class jobs

Re-run Emerson after P0–P1:

1. Lead story is **hardware / Mapping Robot** (or explicit note if profile lacks it).
2. C++ appears only if evidence supports **professional** use — else omitted + optional chip.
3. Leftover chips are concrete (language, framework, tool) — never vague “software development.”
4. JD `extracted_data` has real responsibilities/skills text, not a vague blurb.
5. Human skim in <10s answers “why this person for *this* Emerson role?”

### Shipped (Task 168 — 2026-09-18)

| # | Change | Status |
|---|--------|--------|
| 1 | Thicker Oracle / generic JD fetch (16k cap, Playwright retry under ~1200 chars, Oracle CX host rule, Playwright threshold 800) | **Shipped** |
| 2 | Prompt proficiency gate (coursework / familiar ≠ professional when JD requires production use) | **Shipped** (prompt; profile skill confidence tags still optional) |
| 3 | Domain-aware project ranking + preferred-project prompt block (`job-relevance` + `execute-run`) | **Shipped** |
| 4 | Analyze stores `role_thesis` + `domain_tags` on `JobExtractedData` | **Shipped** |
| 5 | Leftover chip concreteness filter (drops “Software development”, Agile, etc.) | **Shipped** |
| 8–9 | Haiku critique / paste-JD UX | Not in 168 |

**Ops note:** Oracle thicken via Playwright needs `JOB_FETCH_PLAYWRIGHT=1` on the host (off by default on Vercel). Re-run Emerson live smoke to close the acceptance bar above.

---

## Related docs

- Pipeline / Edit UI: [TAILOR-EDIT.md](./TAILOR-EDIT.md)
- Legacy two-pass design: [legacy/planning/03-tailoring-engine.md](./legacy/planning/03-tailoring-engine.md)
- Our GitHub OAuth (not OSS survey): [GITHUB.md](./GITHUB.md)
- Extension competitors (Teal/Jobright): [EXT-COMPETITOR-UX.md](./EXT-COMPETITOR-UX.md)
