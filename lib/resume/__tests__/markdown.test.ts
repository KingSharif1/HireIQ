import { describe, expect, it } from 'vitest'
import {
  extractResumeMarkdown,
  markdownToStructuredResume,
  streamingResumeProgress,
  structuredResumeToMarkdown,
} from '@/lib/resume/markdown'
import { sampleStructuredResume } from '@/lib/profile/__tests__/fixtures'

describe('resume markdown codec', () => {
  it('round-trips a sample resume with stable ids', () => {
    const original = sampleStructuredResume({
      summary: 'Backend engineer who ships APIs.',
      experience: [
        {
          id: 'exp_acme',
          company: 'Acme',
          title: 'Software Engineer',
          location: 'Remote',
          startDate: '01/2022',
          endDate: 'Present',
          current: true,
          bullets: ['Built REST APIs in Node'],
          skills_used: ['Node.js', 'TypeScript'],
        },
      ],
      projects: [
        {
          id: 'proj_hiq',
          name: 'HireIQ',
          description: 'Resume tailor',
          bullets: ['Streaming markdown rewrite'],
          technologies: ['Next.js'],
          url: '',
          github: 'https://github.com/example/hireiq',
        },
      ],
      skills: {
        technical: ['TypeScript', 'Node.js'],
        soft: ['Communication'],
        tools: ['Git'],
        languages: ['English'],
      },
    })

    const md = structuredResumeToMarkdown(original)
    expect(md).toContain('<!-- id:exp_acme -->')
    expect(md).toContain('<!-- id:proj_hiq -->')
    expect(md).toContain('## Summary')

    const parsed = markdownToStructuredResume(md)
    expect(parsed.contact.name).toBe(original.contact.name)
    expect(parsed.summary).toContain('Backend engineer')
    expect(parsed.experience[0].id).toBe('exp_acme')
    expect(parsed.experience[0].bullets[0]).toContain('REST')
    expect(parsed.projects[0].id).toBe('proj_hiq')
    expect(parsed.skills.technical).toContain('TypeScript')
  })

  it('parses tailoring notes', () => {
    const md = `# Jane
jane@example.com

## Summary
Tailored summary.

## Experience
### Eng | Acme | 2022 – Present <!-- id:exp_1 -->
- Did the thing

## Tailoring notes
- **summary** — change: Tailored summary. — reason: Named APIs for this JD.
`
    const parsed = markdownToStructuredResume(md)
    expect(parsed.tailoring_notes?.[0].section).toBe('summary')
    expect(parsed.tailoring_notes?.[0].reason).toContain('APIs')
  })

  it('strips fences and reports streaming progress', () => {
    const fenced = 'Here you go\n```markdown\n# A\n\n## Summary\nHi\n```'
    expect(extractResumeMarkdown(fenced)).toContain('# A')
    expect(streamingResumeProgress('# A\n\n## Experience\n')).toMatch(/experience/i)
  })
})
