# Deploy HireIQ apply worker to Cloud Run

This is the **exact** setup for Task 148. The Next.js app on Vercel only **queues** runs; Playwright runs here.

## Prerequisites

1. A GCP project with billing enabled (free tier often covers low volume)
2. `gcloud` CLI logged in: `gcloud auth login`
3. APIs enabled: Cloud Run, Artifact Registry, Cloud Build
4. Secrets ready:
   - `APPLY_WORKER_SECRET` — long random string (same value on Vercel + Cloud Run)
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — service role (never put this in the browser)

## One-time GCP setup

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=us-east1
export REPO=hireiq
export SERVICE=hireiq-apply-worker

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="HireIQ images" || true

# New projects often block Cloud Build from reading gs://PROJECT_cloudbuild
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/storage.objectAdmin" \
  --condition=None
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/artifactregistry.writer" \
  --condition=None
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/logging.logWriter" \
  --condition=None
```

## Build & push image (from repo root)

Older Cloud Shell `gcloud` does **not** accept `--file` or `--dockerfile`. Use a Cloud Build config:

```bash
export IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE}:$(git rev-parse --short HEAD)"

cat > /tmp/cb-apply.yaml <<EOF
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-t', '${IMAGE}', '-f', 'services/apply-worker/Dockerfile', '.']
images:
  - ${IMAGE}
timeout: 1200s
EOF

gcloud builds submit --config=/tmp/cb-apply.yaml --timeout=1200 .
```

## Deploy Cloud Run service

```bash
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --cpu 2 \
  --memory 2Gi \
  --timeout 300 \
  --concurrency 1 \
  --max-instances 3 \
  --min-instances 0 \
  --no-allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co" \
  --set-secrets "APPLY_WORKER_SECRET=APPLY_WORKER_SECRET:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest"
```

Create secrets first if needed:

```bash
echo -n 'your-long-random-secret' | gcloud secrets create APPLY_WORKER_SECRET --data-file=-
echo -n 'your-supabase-service-role-key' | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-

# Grant the Cloud Run service account access to secrets
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding APPLY_WORKER_SECRET \
  --member="serviceAccount:${SA}" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding SUPABASE_SERVICE_ROLE_KEY \
  --member="serviceAccount:${SA}" --role="roles/secretmanager.secretAccessor"
```

If you prefer plain env vars for a personal prototype (less ideal):

```bash
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --cpu 2 --memory 2Gi --timeout 300 --concurrency 1 --min-instances 0 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co,SUPABASE_SERVICE_ROLE_KEY=…,APPLY_WORKER_SECRET=…"
```

`--allow-unauthenticated` is OK **only if** every `/run` call requires `Authorization: Bearer $APPLY_WORKER_SECRET` (our worker does). Prefer `--no-allow-unauthenticated` + invoker IAM for production.

## Wire Vercel

In Vercel → Project → Settings → Environment Variables (Production):

| Name | Value |
|------|--------|
| `APPLY_WORKER_URL` | `https://hireiq-apply-worker-xxxxx-ue.a.run.app` (no trailing slash; app posts to `/run`) |
| `APPLY_WORKER_SECRET` | Same secret as Cloud Run |

Redeploy Vercel after saving.

Get the URL:

```bash
gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)'
```

## Smoke test

```bash
# Health
curl -sS "$APPLY_WORKER_URL/health"

# After queuing a run from the HireIQ UI, or manually:
curl -sS -X POST "$APPLY_WORKER_URL/run" \
  -H "Authorization: Bearer $APPLY_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"runId":"PASTE-UUID-FROM-apply_runs"}'
```

On a job detail page: **Auto-apply with HireIQ** → status should move queued → running → needs_user/applied.

## What “good like Sprout” means (honest)

| | Sprout | HireIQ today |
|--|--------|----------------|
| Common ATS (GH / Lever / Ashby / Workday) | Strong | Strong and improving — same board adapters as the extension |
| Weird custom career sites | Mixed | Often `needs_user` until we add an adapter |
| CAPTCHA | Human / pause | We pause (`needs_user`) |
| LinkedIn / Indeed | Limited / ToS | We **block** auto-submit |
| Live “watch the agent” video | Their product UX | We show **live progress in HireIQ** (fields filled + steps), not a free live Chromium stream in v1 |

So: **yes on the big boards once Cloud Run is wired**; **not magic on every site day one**. Coverage grows when failed hosts get adapters (same as Sprout’s reality).

## Cost ballpark (Cloud Run vs $28 VPS)

Assumptions: **2 vCPU · 2 GiB · request-based billing · min instances 0**.  
Rates (Tier 1 / us-central1-style): ~**$0.000024 / vCPU-s**, ~**$0.0000025 / GiB-s** ([Cloud Run pricing](https://cloud.google.com/run/pricing)).  
Free tier/mo (request-based): **180k vCPU-s · 360k GiB-s · 2M requests**.

| Run length | Rough meaning | ≈ $/run (before free tier) |
|------------|---------------|----------------------------|
| 45s | Simple GH dry-run | ~$0.0024 |
| 90s | Typical fill + resume | ~$0.0048 |
| 180s | Workday-ish | ~$0.0095 |
| 300s | Hard / retries | ~$0.016 |

- Free tier covers ~**1,000 × 90s** applies/month before meaningful charges.
- Personal volume (30–200 apps/mo) ≈ **$0** after free tier.
- Cloud Run monthly ≈ $28 only at **thousands** of long applies — not personal hunt scale.
- Idle Cloud Run ≈ **$0**; VPS is **$28 whether you apply or not**.
- Sprout public plans (~$60/mo · 200 apps) ≈ **$0.30+/app** — far above raw Cloud Run compute.

Caveats: cold starts, ATS egress, Artifact Registry, retries. Keep the VPS only if you already need it for other work.

## Local debug (no Cloud Run)

```bash
# Terminal 1
export APPLY_WORKER_SECRET=dev
export NEXT_PUBLIC_SUPABASE_URL=…
export SUPABASE_SERVICE_ROLE_KEY=…
npm run apply:worker

# Terminal 2 / .env.local for Next
APPLY_WORKER_URL=http://127.0.0.1:8080
APPLY_WORKER_SECRET=dev
# optional: APPLY_WORKER_INLINE=1  # run Playwright inside Next (dev only)
```
