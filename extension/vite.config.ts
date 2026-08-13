import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(rootDir, '..')

function readDotEnvLocal(): Record<string, string> {
  const file = path.join(repoRoot, '.env.local')
  if (!existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

export default defineConfig(({ mode }) => {
  const env = { ...readDotEnvLocal(), ...loadEnv(mode, repoRoot, '') }
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || ''
  const supabaseAnon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || ''

  return {
    plugins: [crx({ manifest })],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
    },
    resolve: {
      alias: {
        '@hireiq/form-fill': path.resolve(rootDir, '../lib/extension/form-fill.ts'),
        '@hireiq/board': path.resolve(rootDir, '../lib/extension/board.ts'),
        '@hireiq/review-choices': path.resolve(rootDir, '../lib/extension/review-choices.ts'),
        '@hireiq/location-country': path.resolve(rootDir, '../lib/extension/location-country.ts'),
        '@hireiq/entry-level': path.resolve(rootDir, '../lib/extension/entry-level.ts'),
      },
    },
    server: {
      fs: {
        allow: [rootDir, repoRoot],
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  }
})
