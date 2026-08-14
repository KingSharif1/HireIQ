# HireIQ — GitHub Integration

Connect GitHub on the **Profile → Projects** section to pull repo metadata and suggest profile projects from your real work.

Uses a **direct GitHub OAuth app** (not Supabase identity linking).

## Prerequisites

1. Run migration **`008_github_integration.sql`** in Supabase SQL Editor — **applied remotely (2026-06-29)**
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
| Homepage URL | `http://localhost:3000` | `https://your-domain.com` |
| Authorization callback URL | `http://localhost:3000/api/github/callback` | `https://your-domain.com/api/github/callback` |

Copy **Client ID** and generate a **Client Secret** into `.env.local`.

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
3. Initial sync fetches up to 30 non-fork repos → `profiles.github_data`
4. **Deep context per repo:** README excerpt, root folder layout, and notable tools from `package.json` (when present)
5. Empty or placeholder repos (no README/code signal) are **not** suggested
6. Unmatched repos become **pending suggestions** (accept/decline)
7. **Sync** re-fetches repos on demand

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/github/connect` | GET | Start OAuth (requires signed-in user) |
| `/api/github/callback` | GET | OAuth callback + initial sync |
| `/api/github/sync` | GET | Connection status |
| `/api/github/sync` | POST | Full repo sync |
| `/api/github/disconnect` | DELETE | Remove connection + cached data |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `GitHub OAuth is not configured` | Set `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` in `.env.local` |
| `Manual linking is disabled` | Old flow — pull latest; connect now uses direct OAuth |
| `state_mismatch` / expired | Click Connect again |
| `GitHub not connected` on sync | Complete Connect flow first |
| Sync 502 / table errors | Run migration 008; check token not revoked |
| Redirect URI mismatch | Callback must exactly match GitHub app settings |

## Security notes

- Access tokens live in `github_connections` (RLS: own row only)
- OAuth `state` stored in httpOnly cookie (10 min)
- Repo metadata in `github_data` — no tokens in that column
- Client never calls GitHub directly — all via server routes
