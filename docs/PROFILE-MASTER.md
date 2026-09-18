# Profile = master resume (how it works)

**As of:** 2026-09-17 · Tasks **163–165** (+ GitHub hub polish)  
**Route:** `/dashboard/profile` · **Code:** `components/profile/**`, `lib/profile/**`

This is the Sprout-style **master evidence hub**. One section at a time. Job-tailored PDFs stay on Applications → Documents.

---

## Rail (left)

| Group | Sections |
|-------|----------|
| PROFILE | Personal Info (includes Application Information) |
| DOCUMENTS | **Resumes**, **Additional Documents** |
| PROFESSIONAL | Summary, URLs, Experience, Volunteering, Projects, Education, Skills & Certs, Achievements, Additional |

Old bookmarks: `?section=exportResume` → Resumes · `?section=attachments` → Additional Documents.

---

## Resumes

1. **Card** — select / Export PDF / open original / replace / delete.
2. **Original upload** — `GET /api/resume/:id/file` (session download, then service-role after ownership check). Client fetches a **blob URL** so a miss is an error, not a black iframe. PDF in-pane; DOCX via Open.
3. **Export PDF** — dialog (not page scroll):
   - Size: Compact / Standard / Spacious
   - Sections: include + reorder
   - Desktop: live `ResumePreview` with zoom/pan (`fitAxis="width"`)
   - Mobile: sheet + optional “Show page preview”
   - Download: `POST /api/export/pdf` with `source: 'master'`
   - Does **not** mutate `profile_data`

Storage: private `resumes` bucket · path `{userId}/{timestamp}.pdf|docx`.

---

## Additional Documents

- **Link** — label, URL, note, optional “refers to” section + entry checkboxes.
- **Upload** — PDF/DOCX → `{userId}/docs/{id}.ext` via `POST /api/profile/documents/upload`; serve with `GET /api/profile/documents/:id/file`.
- Legacy `profile_data.attachments[]` merges into `additionalDocuments` on read; next save clears `attachments`.

---

## Professional sections

- Long bullets / summary textareas **auto-grow** (no inner scroll).
- Experience / projects show provenance (“From GitHub”, tailor, etc.) when present.
- Suggestions render **inside** the target entry when they have `targetEntryId`; new proposals lead the section.

---

## Projects + GitHub

One **GitHub** panel: Connect / Sync / Disconnect / **Add from GitHub**.

When adding a synced repo (`planRepoAdd`):

| Case | Behavior |
|------|----------|
| Already linked | No-op + message |
| Profile README (`user/user`, almost only README) | Ask to **link** to a portfolio-like project (e.g. Personal Portfolio) — do not invent a new card |
| Name matches an unlinked project | Ask to link |
| Real product repo | Create new project |

On **sync** (not only Add): high-confidence name/URL matches auto-fill `project.github` (`linkProjectGithubUrls`). Soft semantic matches (portfolio ↔ oddly named site repo) stay **ask**, never silent. Already-linked cards get tool/bullet **update suggestions** from the repo (`gh-{repoId}-bullet` / `gh-{repoId}-tool-*`); declined ids live in `dismissedSuggestionIds` and never reappear. Full policy: DECISIONS 2026-09-18 · [GITHUB.md](./GITHUB.md).

Deep analysis (Task 164): explicit “Analyze repository” on a linked card; cache by commit SHA in `repo_intelligence`. Tailor may use that as **context** even when bullets stay off the master until accepted.

Settings → GitHub uses the same panel with `showAddProject={false}`.

---

## Data flow (master)

```
Upload PDF/DOCX → /api/resume/parse → resumes row + optional profile seed
Edit Profile UI → useProfileSave → profiles.profile_data JSONB
Export PDF → applyInclusion + theme → /api/export/pdf → download (no write)
Extra doc upload → resumes bucket /docs/ → profile_data.additionalDocuments
GitHub sync → github_data + optional pending suggestions / link URLs
```

---

## Verify

- Unit: `lib/profile/__tests__/documents.test.ts`, `lib/github/__tests__/scan-project.test.ts`
- UI: `npm run ui:profile-docs:headed` → `.ui-audit/profile-*.png`

---

## Not in this hub (next work)

| Task | What |
|------|------|
| **162** | Draft-first tailor (other agent lane) |
| **166** ✓ | Suggestion quality shipped — dedupe, attribution, Harper retarget |
| **164 smoke** | Reconnect GitHub and deep-scan a real linked repo |
| Job Documents | Per-job tailor / Edit / Match (already shipped; separate from master) |

See [STATUS.md](./STATUS.md) · [TASKS.md](./TASKS.md) · [TAILOR-EDIT.md](./TAILOR-EDIT.md) · [DECISIONS.md](./DECISIONS.md)
