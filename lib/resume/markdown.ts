import type {
  StructuredResume,
  ResumeExperience,
  ResumeProject,
  ResumeEducation,
  ResumeCertification,
  TailoringNote,
} from '@/types'
import { normalizeStructuredResume } from '@/lib/ai/tailor-engine'

/** Stable HireIQ resume markdown — model wire format, not storage. */

const ID_RE = /<!--\s*id:([a-zA-Z0-9_-]+)\s*-->/

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function bullets(lines: string[]): string[] {
  return lines
    .map(l => l.replace(/^[-*•]\s+/, '').trim())
    .filter(Boolean)
}

function splitCsv(line: string): string[] {
  return line
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export function structuredResumeToMarkdown(resume: StructuredResume): string {
  const r = normalizeStructuredResume(resume)
  const lines: string[] = []

  const c = r.contact
  lines.push(`# ${c.name || 'Candidate'}`)
  const meta = [c.email, c.phone, c.location, c.linkedin, c.github, c.portfolio || c.website]
    .filter(Boolean)
    .join(' · ')
  if (meta) lines.push(meta)
  lines.push('')

  if (r.summary) {
    lines.push('## Summary')
    lines.push(r.summary.trim())
    lines.push('')
  }

  if (r.experience.length) {
    lines.push('## Experience')
    for (const e of r.experience) {
      const dates = [e.startDate, e.current ? 'Present' : e.endDate].filter(Boolean).join(' – ')
      const head = [`### ${e.title || 'Role'}`, e.company, dates].filter(Boolean).join(' | ')
      lines.push(`${head} <!-- id:${e.id} -->`)
      if (e.location) lines.push(`_${e.location}_`)
      for (const b of e.bullets) lines.push(`- ${b}`)
      if (e.skills_used.length) lines.push(`Skills: ${e.skills_used.join(', ')}`)
      lines.push('')
    }
  }

  if (r.projects.length) {
    lines.push('## Projects')
    for (const p of r.projects) {
      lines.push(`### ${p.name || 'Project'} <!-- id:${p.id} -->`)
      if (p.description) lines.push(p.description)
      for (const b of p.bullets) lines.push(`- ${b}`)
      if (p.technologies.length) lines.push(`Tech: ${p.technologies.join(', ')}`)
      const links = [p.url, p.github].filter(Boolean).join(' · ')
      if (links) lines.push(links)
      lines.push('')
    }
  }

  const skillBits = [
    r.skills.languages.length ? `**Languages:** ${r.skills.languages.join(', ')}` : '',
    r.skills.technical.length ? `**Frameworks & Tools:** ${r.skills.technical.join(', ')}` : '',
    r.skills.tools.length ? `**Cloud & Data:** ${r.skills.tools.join(', ')}` : '',
    r.skills.soft.length ? `**Soft Skills:** ${r.skills.soft.join(', ')}` : '',
  ].filter(Boolean)
  if (skillBits.length) {
    lines.push('## Skills')
    lines.push(...skillBits)
    lines.push('')
  }

  if (r.education.length) {
    lines.push('## Education')
    for (const e of r.education) {
      const head = [e.degree, e.field, e.institution].filter(Boolean).join(' · ')
      const dates = [e.startDate, e.endDate].filter(Boolean).join(' – ')
      lines.push(`### ${head || 'Education'} <!-- id:${e.id} -->`)
      if (dates) lines.push(dates)
      if (e.gpa) lines.push(`GPA: ${e.gpa}`)
      lines.push('')
    }
  }

  if (r.certifications.length) {
    lines.push('## Certifications')
    for (const cert of r.certifications) {
      lines.push(`- ${[cert.name, cert.issuer, cert.date].filter(Boolean).join(' · ')}`)
    }
    lines.push('')
  }

  const volunteer = (r.volunteer ?? []) as Array<{
    organization?: string
    role?: string
    bullets?: string[]
  }>
  if (volunteer.length) {
    lines.push('## Volunteering')
    for (const v of volunteer) {
      const head = [v.role, v.organization].filter(Boolean).join(' @ ')
      if (head) lines.push(`### ${head}`)
      for (const b of v.bullets ?? []) {
        if (b.trim()) lines.push(`- ${b}`)
      }
      lines.push('')
    }
  }

  const awards = (r.awards ?? []) as Array<{
    title?: string
    issuer?: string
    date?: string
    description?: string
  }>
  if (awards.length) {
    lines.push('## Achievements')
    for (const a of awards) {
      const head = [a.title, a.issuer, a.date].filter(Boolean).join(' · ')
      lines.push(head ? `- ${head}${a.description?.trim() ? `: ${a.description.trim()}` : ''}` : `- ${a.description?.trim()}`)
    }
    lines.push('')
  }

  if (r.tailoring_notes?.length) {
    lines.push('## Tailoring notes')
    for (const n of r.tailoring_notes) {
      lines.push(`- **${n.section}** — change: ${n.change} — reason: ${n.reason}`)
    }
    lines.push('')
  }

  return lines.join('\n').trim() + '\n'
}

function sectionBodies(md: string): Map<string, string> {
  const map = new Map<string, string>()
  const parts = md.split(/^##\s+/m)
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const nl = trimmed.indexOf('\n')
    const title = (nl === -1 ? trimmed : trimmed.slice(0, nl)).trim().toLowerCase()
    const body = nl === -1 ? '' : trimmed.slice(nl + 1).trim()
    if (title.startsWith('#')) continue
    map.set(title, body)
  }
  return map
}

function parseExperienceBlock(block: string, index: number): ResumeExperience {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
  const head = lines[0] ?? ''
  const id = head.match(ID_RE)?.[1] || `exp_${index + 1}`
  const headClean = head.replace(ID_RE, '').replace(/^###\s*/, '').trim()
  const bits = headClean.split('|').map(s => s.trim())
  const title = bits[0] || ''
  const company = bits[1] || ''
  const dates = bits[2] || ''
  const [startDate, endRaw] = dates.split(/[–-]/).map(s => s.trim())
  const endDate = endRaw || ''
  const current = /present/i.test(endDate)
  const locLine = lines.find(l => l.startsWith('_') && l.endsWith('_'))
  const location = locLine ? locLine.replace(/^_|_$/g, '') : ''
  const skillsLine = lines.find(l => /^skills:/i.test(l))
  const skills_used = skillsLine ? splitCsv(skillsLine.replace(/^skills:\s*/i, '')) : []
  const bulletLines = lines.filter(l => /^[-*•]\s+/.test(l))
  return {
    id,
    title,
    company,
    location,
    startDate: startDate || '',
    endDate: current ? 'Present' : endDate,
    current,
    bullets: bullets(bulletLines),
    skills_used,
  }
}

function parseProjectBlock(block: string, index: number): ResumeProject {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
  const head = lines[0] ?? ''
  const id = head.match(ID_RE)?.[1] || `proj_${index + 1}`
  const name = head.replace(ID_RE, '').replace(/^###\s*/, '').trim()
  const techLine = lines.find(l => /^tech:/i.test(l))
  const technologies = techLine ? splitCsv(techLine.replace(/^tech:\s*/i, '')) : []
  const bulletLines = lines.filter(l => /^[-*•]\s+/.test(l))
  const desc = lines.find(
    l =>
      !l.startsWith('###') &&
      !/^[-*•]\s+/.test(l) &&
      !/^tech:/i.test(l) &&
      !/^https?:/i.test(l),
  )
  const links = lines.filter(l => /^https?:/i.test(l) || l.includes('github.com'))
  return {
    id,
    name,
    description: desc || '',
    bullets: bullets(bulletLines),
    technologies,
    url: links[0] || '',
    github: links.find(l => /github/i.test(l)) || '',
  }
}

function parseEducationBlock(block: string, index: number): ResumeEducation {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
  const head = lines[0] ?? ''
  const id = head.match(ID_RE)?.[1] || `edu_${index + 1}`
  const headClean = head.replace(ID_RE, '').replace(/^###\s*/, '').trim()
  const bits = headClean.split('·').map(s => s.trim())
  const dates = lines.find(l => /\d{4}/.test(l) && !/^gpa:/i.test(l) && !l.startsWith('###'))
  const [startDate, endDate] = (dates || '').split(/[–-]/).map(s => s.trim())
  const gpa = lines.find(l => /^gpa:/i.test(l))?.replace(/^gpa:\s*/i, '') || ''
  return {
    id,
    degree: bits[0] || '',
    field: bits[1] || '',
    institution: bits[2] || bits[1] || '',
    startDate: startDate || '',
    endDate: endDate || '',
    gpa,
    relevant_courses: [],
    honors: [],
  }
}

function parseNotes(body: string): TailoringNote[] {
  const notes: TailoringNote[] = []
  for (const line of body.split('\n')) {
    const m = line.match(/^[-*]\s+\*\*(.+?)\*\*\s*—\s*change:\s*(.+?)\s*—\s*reason:\s*(.+)\s*$/i)
    if (!m) continue
    notes.push({ section: clean(m[1]), change: clean(m[2]), reason: clean(m[3]) })
  }
  return notes
}

function parseContact(md: string): StructuredResume['contact'] {
  const lines = md.trim().split('\n')
  const name = (lines[0] || '').replace(/^#\s+/, '').trim()
  const metaLine = lines.slice(1).find(l => l.includes('@') || l.includes('·') || l.includes('|')) || ''
  const parts = metaLine.split(/[·|]/).map(s => s.trim()).filter(Boolean)
  const email = parts.find(p => p.includes('@')) || ''
  const phone = parts.find(p => /[\d()+.-]{7,}/.test(p) && !p.includes('@')) || ''
  const linkedin = parts.find(p => /linkedin/i.test(p)) || ''
  const github = parts.find(p => /github/i.test(p)) || ''
  const portfolio = parts.find(p => /^https?:/i.test(p) && !/linkedin|github/i.test(p)) || ''
  const location =
    parts.find(
      p => p !== email && p !== phone && p !== linkedin && p !== github && p !== portfolio && !/^https?:/i.test(p),
    ) || ''
  return {
    name,
    email,
    phone,
    location,
    linkedin,
    github,
    portfolio,
    website: portfolio,
  }
}

/** Strip fences / leading prose, keep from first heading. */
export function extractResumeMarkdown(text: string): string {
  const fence = text.match(/```(?:markdown|md)?\n?([\s\S]*?)\n?```/i)
  const body = (fence ? fence[1] : text).trim()
  const start = body.search(/^#\s+/m)
  return start === -1 ? body : body.slice(start)
}

/**
 * Infer which section the model is currently writing (for live progress).
 */
export function streamingResumeProgress(partialMd: string): string {
  const md = extractResumeMarkdown(partialMd).toLowerCase()
  if (md.includes('## tailoring notes')) return 'Noting what changed'
  if (md.includes('## certifications')) return 'Updating certifications'
  if (md.includes('## education')) return 'Updating education'
  if (md.includes('## skills')) return 'Updating skills'
  if (md.includes('## projects')) return 'Writing projects'
  if (md.includes('## experience')) return 'Rewriting experience'
  if (md.includes('## summary')) return 'Writing summary'
  if (md.includes('# ')) return 'Starting your version'
  return 'Writing your version'
}

export function markdownToStructuredResume(text: string): StructuredResume {
  const md = extractResumeMarkdown(text)
  const sections = sectionBodies(md)
  const contact = parseContact(md)

  const experienceBody = sections.get('experience') || ''
  const experience = experienceBody
    ? experienceBody
        .split(/^###\s+/m)
        .map(s => s.trim())
        .filter(Boolean)
        .map((block, i) => parseExperienceBlock(`### ${block}`, i))
    : []

  const projectsBody = sections.get('projects') || ''
  const projects = projectsBody
    ? projectsBody
        .split(/^###\s+/m)
        .map(s => s.trim())
        .filter(Boolean)
        .map((block, i) => parseProjectBlock(`### ${block}`, i))
    : []

  const educationBody = sections.get('education') || ''
  const education = educationBody
    ? educationBody
        .split(/^###\s+/m)
        .map(s => s.trim())
        .filter(Boolean)
        .map((block, i) => parseEducationBlock(`### ${block}`, i))
    : []

  const skillsBody = sections.get('skills') || ''
  const matchSkillLine = (...labels: string[]) => {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const bold = skillsBody.match(new RegExp(`\\*\\*${escaped}:\\*\\*\\s*(.+)`, 'i'))?.[1]
      if (bold) return bold
      const plain = skillsBody.match(new RegExp(`^${escaped}:\\s*(.+)`, 'im'))?.[1]
      if (plain) return plain
    }
    return ''
  }
  const technical = matchSkillLine('Frameworks & Tools', 'Technical', 'Frameworks')
  const tools = matchSkillLine('Cloud & Data', 'Cloud & DevOps', 'Tools')
  const languages = matchSkillLine('Languages')
  const soft = matchSkillLine('Soft Skills', 'Soft')

  const certBody = sections.get('certifications') || ''
  const certifications: ResumeCertification[] = certBody
    .split('\n')
    .filter(l => /^[-*]\s+/.test(l))
    .map(l => {
      const bits = l.replace(/^[-*]\s+/, '').split('·').map(s => s.trim())
      return { name: bits[0] || '', issuer: bits[1] || '', date: bits[2] || '', url: '' }
    })

  const notes = parseNotes(sections.get('tailoring notes') || '')

  return normalizeStructuredResume({
    contact,
    summary: sections.get('summary') || '',
    experience,
    education,
    skills: {
      technical: splitCsv(technical),
      tools: splitCsv(tools),
      languages: splitCsv(languages),
      soft: splitCsv(soft),
    },
    projects,
    certifications,
    volunteer: [],
    awards: [],
    tailoring_notes: notes.length ? notes : undefined,
  })
}
