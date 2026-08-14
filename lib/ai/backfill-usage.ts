import { createAdminClient } from '@/lib/supabase/admin'
import {
  AI_MODELS,
  charsToTokens,
  estimateTokenCostUsd,
  roundUsd,
} from '@/lib/ai/models'

const HISTORICAL_MODEL_STRONG = AI_MODELS.strong
const HISTORICAL_MODEL_FAST = AI_MODELS.fast
const SOURCE = 'historical_backfill'

function jobAnalyzeTokens(descLen: number) {
  const input = 220 + charsToTokens(Math.min(descLen, 10_000))
  const output = 800
  return {
    input,
    output,
    model: HISTORICAL_MODEL_STRONG,
    cost: estimateTokenCostUsd(HISTORICAL_MODEL_STRONG, input, output),
  }
}

function resumeParseTokens(rawLen: number) {
  const input = 180 + charsToTokens(Math.min(rawLen, 12_000))
  const output = 2200
  return {
    input,
    output,
    model: HISTORICAL_MODEL_STRONG,
    cost: estimateTokenCostUsd(HISTORICAL_MODEL_STRONG, input, output),
  }
}

function tailorPipelineTokens() {
  const genIn = 9200
  const genOut = 4000
  const critIn = 12800
  const critOut = 800
  const input = genIn + critIn + critIn
  const output = genOut + critOut + critOut
  const cost = roundUsd(
    estimateTokenCostUsd(HISTORICAL_MODEL_STRONG, genIn, genOut) +
      estimateTokenCostUsd(HISTORICAL_MODEL_FAST, critIn, critOut) +
      estimateTokenCostUsd(HISTORICAL_MODEL_STRONG, critIn, critOut),
  )
  return { input, output, model: HISTORICAL_MODEL_STRONG, cost }
}

function coverLetterTokens() {
  const input = 2300
  const output = 700
  return {
    input,
    output,
    model: HISTORICAL_MODEL_STRONG,
    cost: estimateTokenCostUsd(HISTORICAL_MODEL_STRONG, input, output),
  }
}

/**
 * Reconstruct Claude spend from saved HireIQ actions for one user.
 * Anthropic Admin Cost API is not available on individual API keys.
 */
export async function ensureHistoricalUsageBackfill(userId: string): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('ai_usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .contains('metadata', { source: SOURCE })

  if ((count ?? 0) > 0) return 0

  const [{ data: jobs }, { data: resumes }, { data: tailored }] = await Promise.all([
    admin
      .from('jobs')
      .select('id, created_at, description')
      .eq('user_id', userId),
    admin
      .from('resumes')
      .select('id, created_at, raw_text')
      .eq('user_id', userId),
    admin
      .from('tailored_resumes')
      .select('id, created_at, cover_letter')
      .eq('user_id', userId),
  ])

  const rows: Record<string, unknown>[] = []

  for (const job of jobs ?? []) {
    const t = jobAnalyzeTokens(String(job.description ?? '').length)
    rows.push({
      user_id: userId,
      created_at: job.created_at,
      feature: 'job_analyze',
      model: t.model,
      key_source: 'hireiq',
      input_tokens: t.input,
      output_tokens: t.output,
      estimated_cost_usd: t.cost,
      metadata: { source: SOURCE, sourceId: `job:${job.id}` },
    })
  }

  for (const resume of resumes ?? []) {
    const t = resumeParseTokens(String(resume.raw_text ?? '').length)
    rows.push({
      user_id: userId,
      created_at: resume.created_at,
      feature: 'resume_parse',
      model: t.model,
      key_source: 'hireiq',
      input_tokens: t.input,
      output_tokens: t.output,
      estimated_cost_usd: t.cost,
      metadata: { source: SOURCE, sourceId: `resume:${resume.id}` },
    })
  }

  for (const tr of tailored ?? []) {
    const t = tailorPipelineTokens()
    rows.push({
      user_id: userId,
      created_at: tr.created_at,
      feature: 'tailor_resume',
      model: t.model,
      key_source: 'hireiq',
      input_tokens: t.input,
      output_tokens: t.output,
      estimated_cost_usd: t.cost,
      metadata: { source: SOURCE, sourceId: `tailor:${tr.id}` },
    })
    if (tr.cover_letter && String(tr.cover_letter).length > 20) {
      const c = coverLetterTokens()
      rows.push({
        user_id: userId,
        created_at: tr.created_at,
        feature: 'cover_letter',
        model: c.model,
        key_source: 'hireiq',
        input_tokens: c.input,
        output_tokens: c.output,
        estimated_cost_usd: c.cost,
        metadata: { source: SOURCE, sourceId: `cover:${tr.id}` },
      })
    }
  }

  if (rows.length === 0) return 0
  const { error } = await admin.from('ai_usage_events').insert(rows)
  if (error) {
    console.error('[ai-usage] historical backfill failed', error.message)
    return 0
  }
  return rows.length
}
