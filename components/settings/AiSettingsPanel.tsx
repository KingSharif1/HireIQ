'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { formatUsd, modelLabel, typicalActionCostUsd, type AiFeature } from '@/lib/ai/models'

type CatalogItem = {
  id: string
  label: string
  tier: string
  inputUsdPerMTok: number
  outputUsdPerMTok: number
}

type FeatureItem = {
  id: string
  label: string
  uses: string
  where: string
}

type SettingsJson = {
  keySource: 'hireiq' | 'byok'
  hasOwnKey: boolean
  keyLast4: string | null
  hireiqKeyConfigured: boolean
  modelStrong: string
  modelFast: string
  catalog: CatalogItem[]
  features: FeatureItem[]
  error?: string
}

type UsageJson = {
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

export function AiSettingsPanel() {
  const [settings, setSettings] = useState<SettingsJson | null>(null)
  const [usage, setUsage] = useState<UsageJson | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [keySource, setKeySource] = useState<'hireiq' | 'byok'>('hireiq')
  const [modelStrong, setModelStrong] = useState('')
  const [modelFast, setModelFast] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, uRes] = await Promise.all([fetch('/api/ai/settings'), fetch('/api/ai/usage')])
      const sJson = (await sRes.json()) as SettingsJson
      const uJson = (await uRes.json()) as UsageJson & { error?: string }
      if (!sRes.ok) throw new Error(sJson.error || 'Failed to load AI settings')
      if (!uRes.ok) throw new Error(uJson.error || 'Failed to load usage')
      setSettings(sJson)
      setUsage(uJson)
      setKeySource(sJson.keySource)
      setModelStrong(sJson.modelStrong)
      setModelFast(sJson.modelFast)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(extra?: { clearKey?: boolean }) {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keySource,
          modelStrong,
          modelFast,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          ...(extra?.clearKey ? { clearKey: true } : {}),
        }),
      })
      const json = (await res.json()) as SettingsJson
      if (!res.ok) throw new Error(json.error || 'Could not save')
      setSettings(json)
      setKeySource(json.keySource)
      setModelStrong(json.modelStrong)
      setModelFast(json.modelFast)
      setApiKey('')
      setInfo('Saved.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading AI settings…
      </div>
    )
  }

  if (!settings) {
    return <p className="text-sm text-destructive">{error || 'Could not load AI settings.'}</p>
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Who pays for Claude</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Use HireIQ’s key until credits run out, or paste your own Anthropic key. Your key is
            encrypted and never sent back to the browser.
          </p>
        </div>
        <div className="grid gap-2">
          <label className="flex items-start gap-2 rounded-lg border border-border p-3 cursor-pointer">
            <input
              type="radio"
              name="ai-key-source"
              className="mt-1"
              checked={keySource === 'hireiq'}
              onChange={() => setKeySource('hireiq')}
            />
            <span>
              <span className="text-sm font-medium text-foreground">HireIQ’s Claude key</span>
              <span className="block text-xs text-muted-foreground">
                {settings.hireiqKeyConfigured
                  ? 'Uses the shared Anthropic account. If this hits a credit limit, switch to your key.'
                  : 'Not configured on this server — add your own key below.'}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-border p-3 cursor-pointer">
            <input
              type="radio"
              name="ai-key-source"
              className="mt-1"
              checked={keySource === 'byok'}
              onChange={() => setKeySource('byok')}
            />
            <span>
              <span className="text-sm font-medium text-foreground">My Anthropic API key</span>
              <span className="block text-xs text-muted-foreground">
                Bills your Anthropic account. Get a key at{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  console.anthropic.com
                </a>
                .
              </span>
            </span>
          </label>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground" htmlFor="anthropic-key">
            API key {settings.keyLast4 ? `(saved …${settings.keyLast4})` : ''}
          </label>
          <Input
            id="anthropic-key"
            type="password"
            autoComplete="off"
            placeholder={settings.hasOwnKey ? '•••••••• (leave blank to keep)' : 'sk-ant-…'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
          {settings.hasOwnKey ? (
            <Button size="sm" variant="outline" onClick={() => void save({ clearKey: true })} disabled={busy}>
              Remove my key
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Models</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Strong is used for tailor, cover letters, job analyze, and resume parse. Fast is used
            for tailor critiques and extension drafts. Haiku is cheapest if you are low on credits.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium space-y-1">
            <span>Strong</span>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={modelStrong}
              onChange={e => setModelStrong(e.target.value)}
            >
              {settings.catalog.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label} — ${m.inputUsdPerMTok}/${m.outputUsdPerMTok} per MTok
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium space-y-1">
            <span>Fast</span>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={modelFast}
              onChange={e => setModelFast(e.target.value)}
            >
              {settings.catalog.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label} — ${m.inputUsdPerMTok}/${m.outputUsdPerMTok} per MTok
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void save()} disabled={busy}>
          Save models
        </Button>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Where each model is used</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Current pick: strong {modelLabel(modelStrong)}, fast {modelLabel(modelFast)}.
          </p>
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {settings.features.map(f => (
            <li key={f.id} className="px-3 py-2 text-sm flex flex-col sm:flex-row sm:justify-between gap-0.5">
              <span className="font-medium text-foreground">{f.label}</span>
              <span className="text-xs text-muted-foreground">
                {f.where}
                {' · '}
                {f.uses === 'infra'
                  ? 'Cloud Run (not Claude)'
                  : f.uses === 'fast'
                    ? modelLabel(modelFast)
                    : f.uses === 'strong+fast'
                      ? `${modelLabel(modelStrong)} + ${modelLabel(modelFast)}`
                      : modelLabel(modelStrong)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Cost per action</h2>
          <p className="text-xs text-muted-foreground mt-1">
            What one click costs with the models above, using Anthropic’s published rates. A tailor
            is several Claude calls; the number is the full action.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(
            [
              { id: 'tailor_resume' as const, blurb: 'Tailor a resume' },
              { id: 'cover_letter' as const, blurb: 'Generate a cover letter' },
              { id: 'job_analyze' as const, blurb: 'Analyze a job' },
            ] as const
          ).map(card => (
            <div key={card.id} className="rounded-xl border border-border px-3 py-3">
              <p className="text-[11px] text-muted-foreground">{card.blurb}</p>
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-1 tabular-nums">
                {formatUsd(typicalActionCostUsd(card.id, { strong: modelStrong, fast: modelFast }))}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">each time</p>
            </div>
          ))}
        </div>
      </section>

      {usage ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">This account</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Past Claude spend reconstructed from your HireIQ actions (jobs, resume parse, tailors,
              cover letters). Anthropic does not expose invoices to a personal API key, so Console
              or other apps are not included.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Est. Claude spend" value={formatUsd(usage.estimatedCostUsd)} />
            <Stat label="Actions logged" value={String(usage.requests)} />
            <Stat label="Tailored resumes" value={String(usage.productCounts.tailorResumes)} />
            <Stat label="Cover letters" value={String(usage.productCounts.coverLetters)} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-xs">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Action</th>
                  <th className="text-right font-medium px-3 py-2">Times</th>
                  <th className="text-right font-medium px-3 py-2">Each</th>
                  <th className="text-right font-medium px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {usage.byFeature.filter(row => row.requests > 0 || row.typicalUsdPerRequest > 0).map(row => (
                  <tr key={row.feature} className="border-t border-border">
                    <td className="px-3 py-2.5 text-foreground">{row.label}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.requests}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                      {formatUsd(row.requests > 0 ? row.avgUsdPerRequest : row.typicalUsdPerRequest)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatUsd(row.estimatedCostUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {usage.recent.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">Recent charges</h3>
              <ul className="rounded-lg border border-border divide-y divide-border">
                {usage.recent.map(ev => (
                  <li key={ev.id} className="px-3 py-2 flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="text-foreground">{ev.feature.replace(/_/g, ' ')}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {new Date(ev.createdAt).toLocaleString()} · {modelLabel(ev.model)} ·{' '}
                        {ev.keySource === 'byok' ? 'your key' : 'HireIQ key'}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-foreground">
                      {formatUsd(ev.estimatedCostUsd)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No charges on this account yet.</p>
          )}
        </section>
      ) : null}

      {info ? <p className="text-xs text-muted-foreground">{info}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">
        Switch both models to Haiku 4.5 to drop the per-action price, then Save.{' '}
        <Link href="https://platform.claude.com/docs/en/about-claude/pricing" className="underline" target="_blank">
          Anthropic pricing
        </Link>
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  )
}
