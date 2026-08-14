'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { modelLabel } from '@/lib/ai/models'

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
    feature: string
    label: string
    requests: number
    estimatedCostUsd: number
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

function usd(n: number): string {
  if (n < 0.01 && n > 0) return `$${n.toFixed(4)}`
  return `$${n.toFixed(2)}`
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

      {usage ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Usage & estimated cost</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Token costs use Anthropic’s published rates. Auto-apply is an infra estimate (~$0.005
              per complexity unit). Anthropic’s invoice is the source of truth.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Tailored resumes" value={String(usage.productCounts.tailorResumes)} />
            <Stat label="Cover letters" value={String(usage.productCounts.coverLetters)} />
            <Stat label="Auto-apply runs" value={String(usage.productCounts.autoApplyRuns)} />
            <Stat label="Est. API spend" value={usd(usage.estimatedCostUsd)} />
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Feature</th>
                  <th className="text-right font-medium px-3 py-2">Requests</th>
                  <th className="text-right font-medium px-3 py-2">Tokens in/out</th>
                  <th className="text-right font-medium px-3 py-2">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {usage.byFeature.map(row => (
                  <tr key={row.feature} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">{row.label}</td>
                    <td className="px-3 py-2 text-right">{row.requests}</td>
                    <td className="px-3 py-2 text-right">
                      {row.inputTokens.toLocaleString()} / {row.outputTokens.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">{usd(row.estimatedCostUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {usage.recent.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">Recent requests</h3>
              <ul className="space-y-1.5">
                {usage.recent.map(ev => (
                  <li key={ev.id} className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                    <span>{new Date(ev.createdAt).toLocaleString()}</span>
                    <span className="text-foreground">{ev.feature}</span>
                    <span>{modelLabel(ev.model)}</span>
                    <span>{ev.keySource === 'byok' ? 'your key' : 'HireIQ key'}</span>
                    <span>
                      {ev.inputTokens + ev.outputTokens > 0
                        ? `${ev.inputTokens + ev.outputTokens} tok`
                        : 'infra'}
                    </span>
                    <span>{usd(ev.estimatedCostUsd)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No metered API requests yet. Older tailor/cover counts above come from saved documents.
            </p>
          )}
        </section>
      ) : null}

      {info ? <p className="text-xs text-muted-foreground">{info}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">
        Need a cheaper default? Set both models to Haiku 4.5, then Save.{' '}
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
