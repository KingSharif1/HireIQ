'use client'

import type { ProfileData, ResumeBlueprint, ResumeRule } from '@/types'
import { RESUME_RULES, bulletIdFor, resolveBlueprint } from '@/lib/profile/blueprint'
import { cn } from '@/lib/utils'

interface Props {
  data: ProfileData
  update: (patch: Partial<ProfileData>) => void
}

/** Effective rule for a bullet: its own rule, else its entry's, else the section's. */
function effectiveRule(
  blueprint: ResumeBlueprint,
  sectionKey: string,
  entryId: string,
  bulletId?: string,
): ResumeRule {
  const entryRule = blueprint.rules[entryId] ?? blueprint.rules[sectionKey] ?? 'auto'
  if (entryRule === 'verbatim') return 'verbatim'
  if (bulletId && blueprint.rules[bulletId]) return blueprint.rules[bulletId]
  return entryRule
}

function RuleSelect({
  value,
  disabled,
  onChange,
}: {
  value: ResumeRule
  disabled?: boolean
  onChange: (rule: ResumeRule) => void
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as ResumeRule)}
      className="h-7 rounded-md border border-border bg-white px-1.5 text-xs disabled:opacity-40"
      aria-label="Tailoring rule"
    >
      {RESUME_RULES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  )
}

function HideToggle({
  hidden,
  onChange,
}: {
  hidden: boolean
  onChange: (hidden: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!hidden)}
      className={cn(
        'h-6 rounded-md border px-1.5 text-[11px] leading-none',
        hidden
          ? 'border-muted-foreground/40 text-muted-foreground'
          : 'border-border text-foreground/70 hover:bg-secondary',
      )}
      aria-pressed={hidden}
      title={hidden ? 'Hidden from resumes' : 'Shown on resumes'}
    >
      {hidden ? 'Hidden' : 'Shown'}
    </button>
  )
}

/** One entry (experience / project) with its bullets' rules. */
function EntryRules({
  blueprint,
  entry,
  sectionKey,
  setRule,
  toggleHidden,
}: {
  blueprint: ResumeBlueprint
  entry: { id: string; title?: string; name?: string; bullets?: string[]; bulletIds?: string[] }
  sectionKey: string
  setRule: (id: string, rule: ResumeRule) => void
  toggleHidden: (id: string) => void
}) {
  const entryRule = blueprint.rules[entry.id] ?? blueprint.rules[sectionKey] ?? 'auto'
  const locked = entryRule === 'verbatim'
  const label = entry.title || entry.name || entry.id
  const bullets = entry.bullets ?? []

  return (
    <div className="rounded-md border border-border/60 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm">{label}</span>
        <div className="flex items-center gap-1.5">
          <RuleSelect value={entryRule} onChange={(r) => setRule(entry.id, r)} />
          <HideToggle hidden={blueprint.hidden.includes(entry.id)} onChange={(h) => toggleHidden(entry.id)} />
        </div>
      </div>
      {bullets.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {bullets.map((b, i) => {
            const id = bulletIdFor(entry, i)
            const rule = effectiveRule(blueprint, sectionKey, entry.id, id)
            return (
              <li key={id} className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    blueprint.hidden.includes(id) && 'text-muted-foreground line-through',
                  )}
                >
                  {b}
                </span>
                <div className="flex items-center gap-1.5">
                  <RuleSelect value={rule} disabled={locked} onChange={(r) => setRule(id, r)} />
                  <HideToggle
                    hidden={blueprint.hidden.includes(id)}
                    onChange={(h) => toggleHidden(id)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {locked && bullets.length > 0 && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Entry is “as written” — bullets are locked to it.
        </p>
      )}
    </div>
  )
}

/**
 * Resume Blueprint: persistent per-item tailoring rules (Sprout-style).
 * "AI decides" (auto) lets the model drop/reword; "Always · tailored" pins it
 * but allows rewording; "Always · as written" pins it untouched.
 */
export function BlueprintPanel({ data, update }: Props) {
  const blueprint = resolveBlueprint(data)

  const setRule = (id: string, rule: ResumeRule) =>
    update({ blueprint: { ...blueprint, rules: { ...blueprint.rules, [id]: rule } } })

  const toggleHidden = (id: string) => {
    const hidden = blueprint.hidden.includes(id)
      ? blueprint.hidden.filter((x) => x !== id)
      : [...blueprint.hidden, id]
    update({ blueprint: { ...blueprint, hidden } })
  }

  const setAiChooses = (aiChooses: boolean) => update({ blueprint: { ...blueprint, aiChooses } })

  const sectionRule = (key: string): ResumeRule => blueprint.rules[key] ?? 'auto'

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-secondary/30 px-3 py-3">
        <label className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">AI chooses what goes in</p>
            <p className="text-xs text-muted-foreground">
              Off: every shown item is always included, nothing is dropped or reworded.
            </p>
          </div>
          <input
            type="checkbox"
            checked={blueprint.aiChooses}
            onChange={(e) => setAiChooses(e.target.checked)}
            className="h-4 w-4"
          />
        </label>
      </div>

      {/* Field-level rules */}
      <div className="space-y-2">
        {(['summary'] as const).map((key) => (
          <div key={key} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
            <span className="text-sm capitalize">{key}</span>
            <div className="flex items-center gap-1.5">
              <RuleSelect value={sectionRule(key)} onChange={(r) => setRule(key, r)} />
              <HideToggle hidden={blueprint.hidden.includes(key)} onChange={(h) => toggleHidden(key)} />
            </div>
          </div>
        ))}
      </div>

      {/* Experience */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Experience</h3>
          <RuleSelect value={sectionRule('experience')} onChange={(r) => setRule('experience', r)} />
        </div>
        {data.experience.map((e) => (
          <EntryRules
            key={e.id}
            blueprint={blueprint}
            entry={e}
            sectionKey="experience"
            setRule={setRule}
            toggleHidden={toggleHidden}
          />
        ))}
      </div>

      {/* Projects */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Projects</h3>
          <RuleSelect value={sectionRule('projects')} onChange={(r) => setRule('projects', r)} />
        </div>
        {data.projects.map((p) => (
          <EntryRules
            key={p.id}
            blueprint={blueprint}
            entry={p}
            sectionKey="projects"
            setRule={setRule}
            toggleHidden={toggleHidden}
          />
        ))}
      </div>

      {/* Education (entries only) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Education</h3>
          <RuleSelect value={sectionRule('education')} onChange={(r) => setRule('education', r)} />
        </div>
        {data.education.map((e) => {
          const label = [e.degree, e.field, e.institution].filter(Boolean).join(' · ') || e.id
          return (
            <div key={e.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
              <span className="min-w-0 truncate text-sm">{label}</span>
              <div className="flex items-center gap-1.5">
                <RuleSelect value={blueprint.rules[e.id] ?? sectionRule('education')} onChange={(r) => setRule(e.id, r)} />
                <HideToggle hidden={blueprint.hidden.includes(e.id)} onChange={(h) => toggleHidden(e.id)} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Skills, certifications, volunteer, awards — section-level only */}
      {(['skills', 'certifications', 'volunteer', 'awards'] as const).map((key) => (
        <div key={key} className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold capitalize">{key}</h3>
          <div className="flex items-center gap-1.5">
            <RuleSelect value={sectionRule(key)} onChange={(r) => setRule(key, r)} />
            <HideToggle hidden={blueprint.hidden.includes(key)} onChange={(h) => toggleHidden(key)} />
          </div>
        </div>
      ))}
    </div>
  )
}
