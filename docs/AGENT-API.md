# HireIQ agent API

Everything an external agent (or a cron) needs to run the job search. All routes accept **either** a signed-in
session cookie **or** `Authorization: Bearer <api_token>` — tokens are the `api_tokens` rows exposed through
`/api/extension/token`.

Base URL: `https://hireiq.kingsharif.com`

---

## `GET /api/agent/follow-ups`

Applications that have gone quiet and deserve one nudge (applied, no reply, past the cadence).

```bash
curl -H "Authorization: Bearer $HIREIQ_TOKEN" https://hireiq.kingsharif.com/api/agent/follow-ups
```

```json
{
  "counts": { "due": 2, "upcoming": 1 },
  "due": [{
    "applicationId": "…", "company": "Acme", "title": "Software Engineer",
    "dueAt": "2026-11-06T12:00:00.000Z", "daysUntilDue": -5,
    "draft": "Hi Acme team,\n\nI applied for the Software Engineer role 5 days ago…"
  }],
  "upcoming": [],
  "skipped": [{ "applicationId": "…", "reason": "replied" }]
}
```

`skipped[].reason` ∈ `closed | not_submitted | replied | no_date | later`.

### `POST /api/agent/follow-ups`

```bash
curl -X POST -H "Authorization: Bearer $HIREIQ_TOKEN" -H 'Content-Type: application/json' \
  -d '{"applicationId":"…","action":"done"}' \
  https://hireiq.kingsharif.com/api/agent/follow-ups
```

`action`: `snooze` (default, 7 days, `days` 1–60) or `done` (re-arms in 30 days).

---

## `POST /api/jobs/discover`

Pull live postings from an employer's own ATS board.

```bash
curl -X POST -H "Authorization: Bearer $HIREIQ_TOKEN" -H 'Content-Type: application/json' \
  -d '{"boards":["greenhouse:acme","https://jobs.lever.co/beta","https://jobs.ashbyhq.com/gamma"],"limitPerBoard":25}' \
  https://hireiq.kingsharif.com/api/jobs/discover
```

- Board formats: `greenhouse:<slug>`, `lever:<slug>`, `ashby:<slug>`, or the careers/board URL.
- `dryRun: true` returns what it found without writing.
- Idempotent — postings whose `apply_url` already exists for the user are skipped.
- Response: `{ boards:[{board,found,error?}], invalid, found, alreadySaved, saved }`.

---

## `POST /api/agent/daily-run`

Spend the day's budget applying to the next N queued applications.

```bash
curl -X POST -H "Authorization: Bearer $HIREIQ_TOKEN" -H 'Content-Type: application/json' \
  -d '{"dryRun":true,"limit":5}' \
  https://hireiq.kingsharif.com/api/agent/daily-run
```

Rules enforced server-side: only `applying` applications, never twice in one day, never a blocked company, never
LinkedIn/Indeed, never an account portal, and never past the credit budget. `dryRun` returns the plan
(`queued`/`skipped` with reasons, `creditsUsed`, `stopReason`) without queuing.

Non-dry-run returns `results[]` with `{ applicationId, jobId, ok, runId?, dispatched?, error? }` and **202**.

---

## Resume a paused apply

```bash
# what does the human need to do?
curl -H "Authorization: Bearer $HIREIQ_TOKEN" \
  https://hireiq.kingsharif.com/api/apply/runs/<runId>/resume

# retry once they've done it (queues a fresh run), or close it
curl -X POST -H "Authorization: Bearer $HIREIQ_TOKEN" -H 'Content-Type: application/json' \
  -d '{"action":"retry"}' https://hireiq.kingsharif.com/api/apply/runs/<runId>/resume
```

`assessment.blocked` names the step (`open|form|identity|resume|submit`), the instruction, and whether a plain retry
suffices. Retry returns **409** when the run isn't resumable.

---

## Referral outreach

```bash
# funnel for a connection
curl -H "Authorization: Bearer $HIREIQ_TOKEN" \
  "https://hireiq.kingsharif.com/api/referrals/outreach?connectionId=<id>"

# log that the ask went out
curl -X POST -H "Authorization: Bearer $HIREIQ_TOKEN" -H 'Content-Type: application/json' \
  -d '{"connectionId":"…","stage":"intro_asked","messageDraft":"…"}' \
  https://hireiq.kingsharif.com/api/referrals/outreach

# move it along
curl -X PATCH -H "Authorization: Bearer $HIREIQ_TOKEN" -H 'Content-Type: application/json' \
  -d '{"id":"…","stage":"referred"}' https://hireiq.kingsharif.com/api/referrals/outreach
```

Stages: `drafting → intro_asked → replied → referred`, with `declined` / `no_response` as terminal exits. Illegal
transitions return **409**.

---

## Notes

- Every route answers **401** without a credential — verified from outside by `npm run verify:deploy`.
- Credits are only enforced when `CREDITS_ENABLED=1`; if the ledger tables are missing the routes return **503** with a
  clear message instead of silently overspending.
- Nothing here sends email or messages on your behalf: drafts are drafts.
