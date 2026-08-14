import { createAdminClient } from '@/lib/supabase/admin'
import {
  AI_FEATURES,
  AI_MODELS,
  AUTO_APPLY_USD_PER_COMPLEXITY_UNIT,
  estimateTokenCostUsd,
  typicalActionCostUsd,
  type AiFeature,
} from '@/lib/ai/models'
import { ensureHistoricalUsageBackfill } from '@/lib/ai/backfill-usage'

export type AiKeySource = 'hireiq' | 'byok'

export function extractTokenUsage(usage: unknown): { inputTokens: number; outputTokens: number } {
  if (!usage || typeof usage !== 'object') return { inputTokens: 0, outputTokens: 0 }
  const u = usage as Record<string, unknown>
  const input =
    num(u.inputTokens) ?? num(u.promptTokens) ?? num(u.input_tokens) ?? 0
  const output =
    num(u.outputTokens) ?? num(u.completionTokens) ?? num(u.output_tokens) ?? 0
  return { inputTokens: input, outputTokens: output }
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export async function recordAiUsage(opts: {
  userId: string
  feature: AiFeature
  model: string
  keySource: AiKeySource
  inputTokens?: number
  outputTokens?: number
  estimatedCostUsd?: number
  metadata?: Record<string, unknown>
}): Promise<void> {
  const inputTokens = opts.inputTokens ?? 0
  const outputTokens = opts.outputTokens ?? 0
  const estimatedCostUsd =
    opts.estimatedCostUsd ?? estimateTokenCostUsd(opts.model, inputTokens, outputTokens)

  const admin = createAdminClient()
  const { error } = await admin.from('ai_usage_events').insert({
    user_id: opts.userId,
    feature: opts.feature,
    model: opts.model,
    key_source: opts.keySource,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: estimatedCostUsd,
    metadata: opts.metadata ?? {},
  })
  if (error) console.error('[ai-usage] insert failed', error.message)
}

export async function recordAutoApplyUsage(opts: {
  userId: string
  runId: string
  complexity: number
}): Promise<void> {
  const units = opts.complexity === 3 ? 3 : 1
  await recordAiUsage({
    userId: opts.userId,
    feature: 'auto_apply',
    model: 'cloud-run',
    keySource: 'hireiq',
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: Math.round(AUTO_APPLY_USD_PER_COMPLEXITY_UNIT * units * 1_000_000) / 1_000_000,
    metadata: { runId: opts.runId, complexity: opts.complexity },
  })
}

export type UsageSummary = {
  requests: number
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  byFeature: {
    feature: AiFeature
    label: string
    requests: number
    estimatedCostUsd: number
    avgUsdPerRequest: number
    typicalUsdPerRequest: number
    inputTokens: number
    outputTokens: number
  }[]
  recent: {
    id: string
    createdAt: string
    feature: string
    model: string
    keySource: string
    inputTokens: number
    outputTokens: number
    estimatedCostUsd: number
  }[]
  productCounts: {
    tailorResumes: number
    coverLetters: number
    autoApplyRuns: number
  }
}

export async function loadUsageSummary(
  userId: string,
  models: { strong: string; fast: string } = AI_MODELS,
): Promise<UsageSummary> {
  await ensureHistoricalUsageBackfill(userId)
  const admin = createAdminClient()

  const [{ data: events }, tailor, cover, apply] = await Promise.all([
    admin
      .from('ai_usage_events')
      .select('id, created_at, feature, model, key_source, input_tokens, output_tokens, estimated_cost_usd')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('tailored_resumes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    admin
      .from('tailored_resumes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('cover_letter', 'is', null),
    admin
      .from('apply_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  const rows = events ?? []
  const by: Record<string, { requests: number; cost: number; input: number; output: number }> = {}
  let requests = 0
  let inputTokens = 0
  let outputTokens = 0
  let estimatedCostUsd = 0

  for (const row of rows) {
    const feature = String(row.feature)
    const cost = Number(row.estimated_cost_usd) || 0
    const inp = Number(row.input_tokens) || 0
    const out = Number(row.output_tokens) || 0
    requests += 1
    inputTokens += inp
    outputTokens += out
    estimatedCostUsd += cost
    const slot = by[feature] ?? { requests: 0, cost: 0, input: 0, output: 0 }
    slot.requests += 1
    slot.cost += cost
    slot.input += inp
    slot.output += out
    by[feature] = slot
  }

  const byFeature = AI_FEATURES.map(f => {
    const slot = by[f.id] ?? { requests: 0, cost: 0, input: 0, output: 0 }
    const typicalUsdPerRequest = typicalActionCostUsd(f.id, models)
    const avgUsdPerRequest = slot.requests > 0 ? round6(slot.cost / slot.requests) : typicalUsdPerRequest
    return {
      feature: f.id,
      label: f.label,
      requests: slot.requests,
      estimatedCostUsd: round6(slot.cost),
      avgUsdPerRequest,
      typicalUsdPerRequest,
      inputTokens: slot.input,
      outputTokens: slot.output,
    }
  })

  return {
    requests,
    inputTokens,
    outputTokens,
    estimatedCostUsd: round6(estimatedCostUsd),
    byFeature,
    recent: rows.slice(0, 25).map(row => ({
      id: row.id,
      createdAt: row.created_at,
      feature: row.feature,
      model: row.model,
      keySource: row.key_source,
      inputTokens: Number(row.input_tokens) || 0,
      outputTokens: Number(row.output_tokens) || 0,
      estimatedCostUsd: Number(row.estimated_cost_usd) || 0,
    })),
    productCounts: {
      tailorResumes: tailor.count ?? 0,
      coverLetters: cover.count ?? 0,
      autoApplyRuns: apply.count ?? 0,
    },
  }
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000
}
