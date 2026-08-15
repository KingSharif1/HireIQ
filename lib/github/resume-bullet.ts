import type { GitHubRepoSnapshot } from './types'

const SKIP_TOOLS = new Set([
  'react-dom',
  'eslint',
  'prettier',
  'typescript-eslint',
  'autoprefixer',
  'postcss',
  'clsx',
  'lucide-react',
  'zod',
])

const TOOL_LABELS: Record<string, string> = {
  next: 'Next.js',
  nuxt: 'Nuxt',
  react: 'React',
  vue: 'Vue',
  svelte: 'Svelte',
  tailwindcss: 'Tailwind CSS',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  prisma: 'Prisma',
  'drizzle-orm': 'Drizzle',
  '@supabase/supabase-js': 'Supabase',
  supabase: 'Supabase',
  stripe: 'Stripe',
  strapi: 'Strapi',
  resend: 'Resend',
  playwright: 'Playwright',
  vite: 'Vite',
  express: 'Express',
  fastify: 'Fastify',
  mongodb: 'MongoDB',
  mongoose: 'MongoDB',
  redis: 'Redis',
  graphql: 'GraphQL',
  firebase: 'Firebase',
  openai: 'OpenAI',
  '@anthropic-ai/sdk': 'Anthropic',
}

export function stripRepoNoise(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[`#*_~]/g, '')
    .replace(/[👑✨🔥⭐️]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function prettyToolName(raw: string): string | null {
  const key = raw.replace(/^@/, '').toLowerCase()
  const pkg = raw.toLowerCase()
  if (SKIP_TOOLS.has(pkg) || SKIP_TOOLS.has(key)) return null
  if (TOOL_LABELS[pkg]) return TOOL_LABELS[pkg]
  if (TOOL_LABELS[raw]) return TOOL_LABELS[raw]
  if (pkg.includes('supabase')) return 'Supabase'
  if (pkg.includes('tailwind')) return 'Tailwind CSS'
  if (/^[a-z0-9-]+$/.test(pkg) && pkg.length < 18) {
    return raw
      .split(/[-_/]/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }
  return null
}

export function stackLabels(repo: GitHubRepoSnapshot, limit = 4): string[] {
  const fromTools = (repo.tools ?? []).map(prettyToolName).filter((v): v is string => Boolean(v))
  const fromLangs = repo.languages.map(prettyToolName).filter((v): v is string => Boolean(v))
  return [...new Set([...fromTools, ...fromLangs])].slice(0, limit)
}

function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

function firstSentence(text: string): string | null {
  const cleaned = stripRepoNoise(text)
  if (cleaned.length < 24) return null
  if (/align\s*=|DOCTYPE|^\s*div\b/i.test(cleaned)) return null
  const match = cleaned.match(/^[^.!?]+[.!?]?/)
  const sentence = (match?.[0] ?? cleaned).trim().replace(/[.!?]+$/, '')
  if (sentence.length < 24 || sentence.length > 180) {
    return sentence.length >= 24 ? `${sentence.slice(0, 160).trim()}` : null
  }
  return sentence
}

/** True when text looks like a real resume line, not README/HTML dump. */
export function isResumeWorthyBullet(text: string): boolean {
  const t = text.trim()
  if (t.length < 36 || t.length > 280) return false
  if (/<[^>]+>|align\s*=|👑|Tools:|#{1,6}\s/.test(t)) return false
  if (/^built \S+ —/i.test(t) && / · /.test(t)) return false
  return true
}

/**
 * One human-sounding highlight from repo metadata (no Claude).
 * Link-only is still valid — this is only for optional “check repo” copy.
 */
export function buildRepoHighlight(repo: GitHubRepoSnapshot): string {
  const stack = stackLabels(repo)
  const fromReadme = repo.readmeExcerpt ? firstSentence(repo.readmeExcerpt) : null
  const fromDesc = repo.description ? firstSentence(repo.description) : null
  const what = fromDesc && fromDesc.length >= 24 ? fromDesc : fromReadme
  const name = repo.name.replace(/[-_]/g, ' ')

  if (what && stack.length) {
    const line = /using|with|built/i.test(what)
      ? `${what}.`
      : `${what}, using ${joinAnd(stack)}.`
    return line.replace(/\.\./g, '.').replace(/\s+/g, ' ').trim()
  }
  if (what) return `${what}.`.replace(/\.\./g, '.')
  if (stack.length) {
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} built with ${joinAnd(stack)}.`
  }
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} — shipped and maintained on GitHub.`
}
