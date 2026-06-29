# 15 — ATS Research (what the parsers actually check)

> Researched 2026-06-14 from multiple parser deep-dives + controlled tests (Workday,
> Greenhouse, Lever, iCIMS, Taleo). Drives the tailoring engine's format rules + the
> Job Hub "ATS readiness" panel. Sources saved in agent-tools dumps.

## The pipeline every ATS runs

1. **Text extraction** — DOCX read from XML; PDF read line-by-line; some legacy use OCR.
2. **Section identification** — finds known headers (Experience, Education, Skills, etc.) as anchors.
3. **Entity extraction (NER)** — names, email, phone, companies, titles, dates, degrees, skills.
4. **Normalization** — into fields (start_date, end_date, job_title…).
5. **Validation** — date ordering, required fields. iCIMS flags uncertain fields for manual entry.
6. **Keyword/relevance scoring** — exact match (legacy) or semantic (modern).

Modern parsers top out ~87% field accuracy vs ~96% human — **1 in 8 fields breaks even on a clean doc.** So format discipline matters.

## Hard rules (bake into the engine + linter)

| Rule | Why | Severity |
|------|-----|----------|
| **Single-column layout** | Multi-column scrambles reading order; Workday/Taleo/iCIMS fail hard; Lever silently drops sidebar | Critical |
| **Standard section headers** (Experience, Education, Skills, Projects, Summary, Certifications) | Parser uses them as structural anchors | Critical |
| **Dates `MM/YYYY` or `Month YYYY`, consistent** | Inconsistent dates corrupt the whole employment timeline; Taleo/Workday infer pattern from first date | Critical |
| **No tables, text boxes, graphics, icons** | Break parsers / scramble text | High |
| **Contact info in body, NOT header/footer** | Workday's parser ignores headers/footers | High |
| **Exact JD keywords, used naturally** | Legacy (Taleo/iCIMS/ADP) need literal matches; modern still weight explicit terms | High |
| **No white-text / hidden keyword stuffing** | Detected + penalized (Greenhouse flags as manipulation) — worse than omitting | High |
| **Put critical keywords in summary + first bullet of recent role** | Parsers weight those zones more heavily | Medium |
| **Standard fonts; DOCX or clean text PDF** | DOCX ~23% fewer errors on Workday; both fine on Greenhouse/Lever | Medium |

## Platform cheat-sheet

| ATS | Parsing | Semantic match | Notes |
|-----|---------|----------------|-------|
| **Greenhouse** | Most forgiving; best skill extraction (Sovren-based) | 85% | Flags hidden text as manipulation |
| **Lever** | Strong on standard formats | 80% | Silently drops text-box/sidebar content |
| **Workday** | Strict headers; struggles non-standard; prefers DOCX | 70% | Ignores headers/footers; knockout questions are the real filter; new account per company |
| **iCIMS** | Strict post-parse validation | 55% | Flags uncertain fields for manual entry |
| **Taleo (Oracle)** | Oldest/strictest; exact section labels + date format; linear single-column | 30% | **Optimize for Taleo → you pass all of them** |

## Key myth-busts (from controlled tests)

- **PDF is fine** on all 5 (text-based): Greenhouse 99%, Lever 97%, Workday 95%, iCIMS 94%, Taleo 89%. DOCX comparable. (Avoid Canva/image-exported PDFs.)
- **Two pages perform as well or better** than one across experience levels (Huntr data). Our seniority budget (1–2pg) is fine.
- **Knockout questions** (visa, min education, certs, years) are the real gate, not mystical keyword scoring. Pass those → a human reads it.
- Recruiters can always open the original file — formatting paranoia is overblown, but clean format still wins.

## HireIQ implications

- **Tailor engine**: enforce single-column structure, standard headers, MM/YYYY normalization (already have `lib/format/normalize.ts`), exact-keyword insertion from JD, block white-text. Target Taleo-strict.
- **Job Hub ATS panel**: surface these as a per-job checklist tied to the detected `ats_system` (see prototype `prototype/hireiq-redesign.html` → Job Hub view).
- **`lib/resume/health.ts`**: extend checks with date-consistency + header-standardization + contact-not-in-header.
