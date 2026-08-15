import { describe, expect, it } from 'vitest'
import { extractJSON, parseModelJson } from '@/lib/ai/parse-json'

describe('parseModelJson', () => {
  it('parses fenced JSON', () => {
    const text = 'Here you go\n```json\n{"ok":true}\n```'
    expect(parseModelJson<{ ok: boolean }>(text)).toEqual({ ok: true })
  })

  it('repairs trailing commas', () => {
    const text = '{"experience":[{"title":"Eng",}],"skills":["TS",]}'
    expect(parseModelJson<{ experience: { title: string }[]; skills: string[] }>(text)).toEqual({
      experience: [{ title: 'Eng' }],
      skills: ['TS'],
    })
  })

  it('closes truncated nested JSON instead of cutting at an inner brace', () => {
    const text =
      '{"direct_matches":[{"jd_requirement":"Swift","user_evidence":"iOS apps"},{"jd_requirement":"REST"'
    const parsed = parseModelJson<{
      direct_matches: { jd_requirement: string; user_evidence?: string }[]
    }>(text)
    expect(parsed.direct_matches[0].jd_requirement).toBe('Swift')
    expect(parsed.direct_matches.length).toBeGreaterThanOrEqual(1)
  })

  it('still throws on genuinely broken JSON', () => {
    expect(() => parseModelJson('{"experience":[ { "title": "Eng" {')).toThrow()
  })
})

describe('extractJSON', () => {
  it('slices a complete object and ignores trailing prose', () => {
    expect(extractJSON('note {"a":1} trailing')).toBe('{"a":1}')
  })

  it('does not slice at an inner brace', () => {
    const text = '{"direct_matches":[{"jd_requirement":"x"}]} trailing'
    expect(extractJSON(text)).toBe('{"direct_matches":[{"jd_requirement":"x"}]}')
  })

  it('keeps truncated JSON so it can be closed', () => {
    const text = '{"direct_matches":[{"jd_requirement":"Swift","user_evidence":"apps"'
    expect(extractJSON(text)).toBe(text)
  })
})
