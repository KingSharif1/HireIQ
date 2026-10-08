import { defineConfig } from '@trigger.dev/sdk'

/**
 * Trigger.dev project config (v4).
 *
 * Setup (one-time, in the Trigger.dev dashboard):
 *   1. Create a project at https://cloud.trigger.dev (or use the existing one).
 *   2. Copy the project ref (looks like `proj_abc123`) and paste it below.
 *   3. Create a Development API key (API Keys page, "Trigger only" access is
 *      enough for local dev) and set it as TRIGGER_SECRET_KEY in .env.local.
 *   4. For deploys, add the Staging/Production API keys plus the task's own
 *      env vars (ANTHROPIC_API_KEY, Supabase keys, …) in the dashboard —
 *      tasks run on Trigger.dev infra, NOT on Vercel, so Vercel env vars
 *      do not carry over.
 *
 * Local dev:  npm run trigger:dev
 * Deploy:     npm run trigger:deploy
 */
export default defineConfig({
  // HireIQ project (Trigger.dev dashboard). Prod deploys: `npm run trigger:deploy`.
  project: 'proj_pxpzhbzddvrliudcyiys',

  // Durable tasks: trigger/tailor-run.ts (tailor) and trigger/healthcheck.ts.
  dirs: ['trigger'],

  runtime: 'node',

  logLevel: 'log',

  // Tailor runs need minutes, not seconds. This is the per-task ceiling
  // (Trigger.dev itself allows up to 14 days); individual tasks override it.
  maxDuration: 600,

  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 2000,
      maxTimeoutInMs: 15000,
      factor: 2,
      randomize: true,
    },
  },
})
