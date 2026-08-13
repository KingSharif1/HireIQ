/** Injected at build time from repo `.env.local` via vite.config.ts */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/** Production website — Store / `vite build` (mode production). */
export const PROD_APP_URL = 'https://hireiq.kingsharif.com'

/** Local Next app — `vite build --mode development` / watch. */
export const DEV_APP_URL = 'http://localhost:3000'

/**
 * Vite production builds ship the Store-facing UI (no API URL field).
 * Dev/watch builds keep localhost + Advanced for engineers.
 */
export const IS_DEV_BUILD = import.meta.env.MODE !== 'production'

export function defaultApiBaseUrl(): string {
  return IS_DEV_BUILD ? DEV_APP_URL : PROD_APP_URL
}
