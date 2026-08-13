# Cloud Run apply worker (Task 148)
#
# Build from repo root:
#   docker build -f services/apply-worker/Dockerfile -t hireiq-apply-worker .
#
# Required env on the service:
#   APPLY_WORKER_SECRET
#   NEXT_PUBLIC_SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#
# On Vercel (queue dispatcher):
#   APPLY_WORKER_URL=https://<cloud-run-url>   # worker exposes POST /run
#   APPLY_WORKER_SECRET=<same secret>
#
# Local:
#   npm run apply:worker
#   APPLY_WORKER_URL=http://127.0.0.1:8080 APPLY_WORKER_SECRET=dev …
#
# Suggested Cloud Run: 2 vCPU, 2–4 GiB, timeout 300s, max concurrency 1.
# Default apply is fill-only (submit=false) until you queue with submit:true.
