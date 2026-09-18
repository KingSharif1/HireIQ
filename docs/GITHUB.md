# HireIQ — GitHub Integration

Connect GitHub on the **Profile → Projects** section to pull repo metadata and suggest profile projects from your real work.

Uses a **direct GitHub OAuth app** (not Supabase identity linking).

## Prerequisites

1. Migrations **008** and **024** are applied remotely (`github_connections` + per-commit intelligence cache)
2. Create a GitHub OAuth App (below)
3. Add credentials to `.env.local`

## Environment

```env
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## GitHub OAuth App

[GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) → **New OAuth App**

| Setting | Local dev | Production |
|---------|-----------|------------|
| Homepage URL | `http://localhost:3000` | `https://hireiq.kingsharif.com` |
| Authorization callback URL | `http://localhost:3000/api/github/callback` | `https://hireiq.kingsharif.com/api/github/callback` |

**Must be the full path** — `/api/github/callback`, not `/api/git`. GitHub rejects truncated callback URLs and HireIQ shows `exchange_failed`.

Copy **Client ID** and generate a **Client Secret** into Vercel / `.env.local`.

### GitHub App vs OAuth App

Your Client ID starts with **`Iv1.`** — that's a **GitHub App**, not a classic OAuth App. HireIQ auto-detects this and **does not send `scope`** in the authorize URL (GitHub Apps 404 otherwise).

In your GitHub App settings, enable **Request user authorization (OAuth)** and set:

| Permission | Access |
|------------|--------|
| Callback URL | `http://localhost:3000/api/github/callback` |
| Repository metadata | Read |
| Contents | Read |

Alternatively, create a classic **OAuth App** (no `Iv1.` prefix) — those use `read:user` + `repo` scopes automatically.

> Separate from Supabase’s GitHub sign-in provider. You do **not** need Supabase manual linking.

## Scopes

- `read:user` — profile username + avatar
- `repo` — list repos, languages, activity (private repos if user grants)

## How it works

1. User clicks **Connect GitHub** → `/api/github/connect` → GitHub authorize
2. GitHub redirects to `/api/github/callback` → token stored in `github_connections`
3. Initial sync indexes up to 200 owned, non-fork repos → `profiles.github_data`; the 30 most recently pushed receive lightweight README/language/manifest enrichment
4. Linking a project to a repository is free and does not scan source code
5. **Analyze repository** resolves the default-branch commit, reads one recursive tree, and sends only bounded, non-secret manifest/docs/config/source files to the configured fast AI model
6. Architecture, verified tool usage, features, key files, and resume-safe highlights are cached in `repo_intelligence` by `(user, repo, commit SHA)`
7. Tailoring expands cached evidence only for linked, job-relevant projects; unscanned repositories retain the lightweight fallback
8. Empty or placeholder repos are not suggested; unmatched meaningful repos become pending project suggestions
9. Linked repos (project already has matching `github` URL) emit pending **tool** (`gh-{id}-tool-*`) and **bullet** (`gh-{id}-bullet`) suggestions only — never silent master writes
10. Declined suggestion ids persist in `dismissedSuggestionIds` and are filtered on the next sync
11. **Sync** re-fetches the lightweight index and reveals when an analyzed repository has newer pushes

## Product intent (CS evidence library)

GitHub is how most CS candidates keep real work. HireIQ uses it so tailor/profile can **recall tools and projects the user forgot to put on the resume** — without making them dig through repos by hand.

**Linking policy** (see DECISIONS 2026-09-18):

| Situation | Behavior |
|-----------|----------|
| Already has this repo’s GitHub URL | Treat as linked; propose tool/bullet **updates** as pending suggestions (**Option A** — never silent-write the master). Accept each; deny forever |
| High-confidence same project (strong name/URL match, not README ambiguity) | Auto-set `project.github` — no second card |
| Soft match (e.g. repo `kinglive` vs resume “Portfolio” / personal site) | **Ask** to link — never silent |
| User declines a GitHub suggestion | Id stored in `profile_data.dismissedSuggestionIds` — re-sync / re-analyze will not re-offer it |
| Archived repo | Do not suggest as a new project |

Repo **intelligence / briefs** can stay as tailor **context** without living on the master resume until the user accepts a suggestion.

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/github/connect` | GET | Start OAuth (requires signed-in user) |
| `/api/github/callback` | GET | OAuth callback + initial sync |
| `/api/github/sync` | GET | Connection status |
| `/api/github/sync` | POST | Full repo sync |
| `/api/github/repos/:repoId/intelligence` | POST | Analyze one synced repository or return its commit cache |
| `/api/github/disconnect` | DELETE | Remove connection + cached data |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `GitHub OAuth is not configured` | Set `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` in Vercel / `.env.local` |
| `Manual linking is disabled` | Old flow — pull latest; connect now uses direct OAuth |
| `state_mismatch` / expired | Click Connect again |
| `GitHub not connected` on sync | Complete Connect flow first |
| Sync 502 / table errors | Run migration 008; check token not revoked |
| Repository analysis storage missing | Apply migration 024 |
| Redirect URI mismatch / `exchange_failed` | Callback must be exactly `https://hireiq.kingsharif.com/api/github/callback` (full path) |
| Connected but Sync errors / 0 repos | Tap Sync again after deploy — empty profiles no longer crash normalize |

## Security notes

- Access tokens live in `github_connections` (RLS: own row only)
- OAuth `state` stored in httpOnly cookie (10 min)
- Repo metadata in `github_data` — no tokens in that column
- Derived repository intelligence is stored separately; selected source contents are not persisted
- `.env*`, credentials/keys, binaries, generated/vendor output, lockfiles, and oversized files are excluded; likely secret assignments are redacted before AI analysis
- Client never calls GitHub directly — all via server routes
