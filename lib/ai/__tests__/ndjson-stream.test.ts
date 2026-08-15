import { describe, expect, it } from 'vitest'
import { streamingJobProgress } from '@/lib/ai/ndjson-stream'

describe('streamingJobProgress', () => {
  it('maps partial analyzer JSON to a short status', () => {
    expect(streamingJobProgress('{"title":"Eng"')).toMatch(/title/i)
    expect(streamingJobProgress('{"required_skills":["TS"]')).toMatch(/required skills/i)
    expect(streamingJobProgress('{"summary":"Build APIs"')).toMatch(/summary/i)
  })
})
