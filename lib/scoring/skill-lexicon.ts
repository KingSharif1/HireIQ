/**
 * Skill vocabulary for scoring: aliases collapse to one canonical key, and
 * matching uses word boundaries so "java" never matches "javascript".
 */

const GROUPS: string[][] = [
  ['javascript', 'js', 'ecmascript', 'es6'],
  ['typescript', 'ts'],
  ['node.js', 'nodejs', 'node'],
  ['react', 'react.js', 'reactjs'],
  ['react native', 'react-native', 'reactnative'],
  ['next.js', 'nextjs', 'next'],
  ['vue', 'vue.js', 'vuejs'],
  ['angular', 'angularjs'],
  ['express', 'express.js', 'expressjs'],
  ['postgresql', 'postgres', 'psql'],
  ['mongodb', 'mongo'],
  ['kubernetes', 'k8s'],
  ['golang', 'go'],
  ['c#', 'csharp', 'c sharp'],
  ['c++', 'cpp'],
  ['amazon web services', 'aws'],
  ['google cloud platform', 'google cloud', 'gcp'],
  ['microsoft azure', 'azure'],
  ['machine learning', 'ml'],
  ['artificial intelligence', 'ai'],
  ['large language models', 'large language model', 'llm', 'llms'],
  ['ci/cd', 'cicd', 'ci cd', 'continuous integration', 'continuous delivery', 'continuous deployment'],
  ['rest', 'restful', 'rest api', 'rest apis', 'restful api', 'restful apis'],
  ['graphql', 'graph ql'],
  ['tailwind css', 'tailwindcss', 'tailwind'],
  ['html', 'html5'],
  ['css', 'css3'],
  ['test automation', 'automated testing', 'qa automation', 'automation testing'],
  ['sql', 'structured query language'],
  ['python', 'python3', 'python 3'],
  ['supabase'],
  ['stripe'],
  ['plaid'],
  ['docker'],
  ['terraform'],
  ['playwright'],
  ['selenium'],
  ['cypress'],
  ['jest'],
  ['pytest'],
  ['java'],
  ['swift'],
  ['kotlin'],
  ['rust'],
  ['ruby'],
  ['ruby on rails', 'rails'],
  ['php'],
  ['redis'],
  ['git'],
  ['linux'],
  ['siem'],
  ['splunk'],
]

/** Short or common-English forms that must only count when they appear as a listed skill, not in running text. */
const LIST_ONLY = new Set([
  'go', 'c', 'r', 'next', 'rest', 'ci', 'ts', 'js', 'ml', 'ai', 'express', 'node', 'swift', 'rails',
])

const CANON = new Map<string, string>()
const ALIASES = new Map<string, string[]>()
for (const group of GROUPS) {
  const key = group[0]
  ALIASES.set(key, group)
  for (const a of group) CANON.set(a, key)
}

function clean(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[’']/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:.\-]+|[\s,;:.\-]+$/g, '')
    .trim()
}

/** Canonical key for a skill string ("Postgres" -> "postgresql"). Unknown skills keep their cleaned form. */
export function canonicalSkill(skill: string): string {
  const c = clean(skill)
  return CANON.get(c) ?? CANON.get(c.replace(/\s+/g, '')) ?? c
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

const reCache = new Map<string, RegExp | null>()

/** Regex matching a canonical skill (and its safe aliases) as a whole token in running text. */
function textRegex(key: string): RegExp | null {
  if (reCache.has(key)) return reCache.get(key) ?? null
  const forms = (ALIASES.get(key) ?? [key]).filter(f => !LIST_ONLY.has(f))
  const safe = forms.length > 0 ? forms : []
  const re = safe.length
    ? new RegExp(`(^|[^a-z0-9+#.])(?:${safe.map(escapeRe).join('|')})(?![a-z0-9+#]|\\.[a-z0-9])`, 'i')
    : null
  reCache.set(key, re)
  return re
}

/** True when running text mentions the skill as a whole word (aliases included). */
export function textMentionsSkill(text: string, skill: string): boolean {
  const re = textRegex(canonicalSkill(skill))
  return re ? re.test(text) : false
}

/** True when a structured list (skills, technologies) contains the skill under any alias. */
export function listHasSkill(list: readonly string[], skill: string): boolean {
  const key = canonicalSkill(skill)
  return list.some(item => {
    const parts = item.split(/[,;/]|\s+and\s+/i)
    return canonicalSkill(item) === key || parts.some(p => p.trim() && canonicalSkill(p) === key)
  })
}
