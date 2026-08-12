'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2, FileText, AlertTriangle, CheckCircle2, MinusCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeResumeForDisplay } from '@/lib/format/normalize'
import { checkResumeHealth, healthScore, type HealthSeverity } from '@/lib/resume/health'
import { resumeSkillLabels } from '@/lib/profile/skills'
import {
  DEFAULT_RESUME_THEME,
  mergeResumeTheme,
  themeFontFamilyCss,
  type ResumeTheme,
} from '@/lib/export/theme'
import type { StructuredResume } from '@/types'

/**
 * WYSIWYG preview of the exported PDF. Mirrors lib/export/pdf-generator.tsx
 * (LETTER page, theme fonts/sizes/spacing). Renders content as discrete
 * page sheets (like a real document viewer) so users can see exactly where it
 * breaks onto page 2/3.
 */
interface ResumePreviewProps {
  data: StructuredResume
  scale?: number
  showTools?: boolean
  /** Show the deterministic "resume health" panel. */
  showHealth?: boolean
  /** Recommended max pages for the role's seniority. 0 = none. */
  recommendedPages?: number
  theme?: ResumeTheme
  /** Drag to pan when zoomed past the viewport (also enables wider zoom range). */
  enablePan?: boolean
  className?: string
}

const MIN_ZOOM = 0.4
const MAX_ZOOM = 1.75

// Letter page geometry at 96 DPI (matches the PDF generator).
const DPI = 96
const PAGE_W = 8.5 * DPI // 816
const PAGE_H = 11 * DPI // 1056

export function ResumePreview({
  data: rawData,
  scale,
  showTools = true,
  showHealth = false,
  recommendedPages = 0,
  theme,
  enablePan = false,
  className,
}: ResumePreviewProps) {
  const data = useMemo(() => normalizeResumeForDisplay(rawData), [rawData])
  const resolvedTheme = useMemo(
    () => mergeResumeTheme(DEFAULT_RESUME_THEME, theme ?? null),
    [theme]
  )

  const padX = resolvedTheme.marginX * DPI
  const padY = resolvedTheme.marginY * DPI
  const usable = PAGE_H - padY * 2
  const bodyW = PAGE_W - padX * 2
  const fontFamily = themeFontFamilyCss(resolvedTheme.fontFamily)

  const measureRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(scale ?? 0.85)
  const [autoFit, setAutoFit] = useState(scale == null)
  const [pageCount, setPageCount] = useState(1)
  const panRef = useRef<{
    active: boolean
    startX: number
    startY: number
    scrollLeft: number
    scrollTop: number
  } | null>(null)
  const [panning, setPanning] = useState(false)

  const measure = useCallback(() => {
    const el = measureRef.current
    if (!el) return
    setPageCount(Math.max(1, Math.ceil(el.scrollHeight / usable - 0.02)))
  }, [usable])

  useEffect(() => {
    measure()
    const el = measureRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, data, resolvedTheme])

  useEffect(() => {
    if (!autoFit) return
    const el = containerRef.current
    if (!el) return
    const fit = () => {
      const avail = el.clientWidth - 32
      setZoom(Math.min(1, Math.max(MIN_ZOOM, avail / PAGE_W)))
    }
    fit()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [autoFit])

  const overRecommended = recommendedPages > 0 && pageCount > recommendedPages

  const health = useMemo(
    () => (showHealth ? checkResumeHealth({ data, pageCount, recommendedPages }) : []),
    [showHealth, data, pageCount, recommendedPages]
  )
  const score = useMemo(() => healthScore(health), [health])

  function zoomBy(delta: number) {
    setAutoFit(false)
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2))))
  }

  function onPanStart(e: React.PointerEvent<HTMLDivElement>) {
    if (!enablePan || e.button !== 0) return
    const el = containerRef.current
    if (!el) return
    // Only pan when content overflows
    if (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1) return
    el.setPointerCapture(e.pointerId)
    panRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    }
    setPanning(true)
  }

  function onPanMove(e: React.PointerEvent<HTMLDivElement>) {
    const pan = panRef.current
    const el = containerRef.current
    if (!pan?.active || !el) return
    el.scrollLeft = pan.scrollLeft - (e.clientX - pan.startX)
    el.scrollTop = pan.scrollTop - (e.clientY - pan.startY)
  }

  function onPanEnd(e: React.PointerEvent<HTMLDivElement>) {
    const el = containerRef.current
    if (el && panRef.current?.active) {
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    panRef.current = null
    setPanning(false)
  }

  const contentStyle: React.CSSProperties = {
    color: '#1a1a1a',
    fontFamily,
    fontSize: resolvedTheme.bodyFontSize,
    lineHeight: resolvedTheme.lineHeight,
  }

  const body = <ResumeBody data={data} theme={resolvedTheme} />

  return (
    <div className={cn('w-full', enablePan && 'flex flex-col min-h-0 h-full', className)}>
      {showTools && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 flex-shrink-0">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              overRecommended
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            {overRecommended ? <AlertTriangle className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            {pageCount} page{pageCount === 1 ? '' : 's'}
            {recommendedPages > 0 && ` · target ${recommendedPages}`}
          </div>

          <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => zoomBy(-0.1)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-xs text-muted-foreground tabular-nums w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => zoomBy(0.1)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAutoFit(true)}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                autoFit
                  ? 'text-foreground bg-secondary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
              aria-label="Fit to width"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showHealth && health.length > 0 && <HealthPanel checks={health} score={score} />}

      {/* Hidden measurer: same width as the page body, used to compute page count. */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          left: -99999,
          top: 0,
          width: bodyW,
          ...contentStyle,
        }}
      >
        {body}
      </div>

      {/* Page sheets — left-aligned when zoomed so horizontal pan/scroll works */}
      <div
        ref={containerRef}
        className={cn(
          'w-full overflow-auto bg-neutral-200 dark:bg-neutral-800 rounded-xl p-4',
          enablePan && 'flex-1 min-h-0',
          enablePan && (panning ? 'cursor-grabbing select-none' : 'cursor-grab')
        )}
        onPointerDown={onPanStart}
        onPointerMove={onPanMove}
        onPointerUp={onPanEnd}
        onPointerCancel={onPanEnd}
      >
        <div
          className={cn(
            'flex flex-col gap-5',
            zoom > 0.95 || enablePan ? 'items-start' : 'items-center'
          )}
          style={{ minWidth: PAGE_W * zoom + 8 }}
        >
          {Array.from({ length: pageCount }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div style={{ width: PAGE_W * zoom, height: PAGE_H * zoom }}>
                <div
                  className="bg-white shadow-xl origin-top-left relative overflow-hidden"
                  style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${zoom})` }}
                >
                  {/* Clipped content window for this page. */}
                  <div
                    style={{
                      position: 'absolute',
                      top: padY,
                      left: padX,
                      width: bodyW,
                      height: usable,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        transform: `translateY(-${i * usable}px)`,
                        ...contentStyle,
                      }}
                    >
                      {body}
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Page {i + 1} of {pageCount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const SEV_STYLE: Record<HealthSeverity, { icon: typeof CheckCircle2; cls: string }> = {
  good: { icon: CheckCircle2, cls: 'text-brand-green' },
  warn: { icon: MinusCircle, cls: 'text-amber-500' },
  bad: { icon: XCircle, cls: 'text-destructive' },
}

function HealthPanel({ checks, score }: { checks: ReturnType<typeof checkResumeHealth>; score: number }) {
  return (
    <div className="mb-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resume health</p>
        <span className={cn('text-sm font-bold', score >= 80 ? 'text-brand-green' : score >= 60 ? 'text-amber-500' : 'text-destructive')}>
          {score}/100
        </span>
      </div>
      <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
        {checks.map(c => {
          const { icon: Icon, cls } = SEV_STYLE[c.severity]
          return (
            <li key={c.id} className="flex items-start gap-2 text-xs">
              <Icon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', cls)} />
              <span className="text-foreground">
                {c.label}
                {c.detail && <span className="text-muted-foreground"> — {c.detail}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ResumeBody({ data, theme }: { data: StructuredResume; theme: ResumeTheme }) {
  const contactLine = [
    data.contact?.email,
    data.contact?.phone,
    data.contact?.location,
    data.contact?.linkedin,
    data.contact?.github,
  ].filter(Boolean).join('  ·  ')

  const allSkills = resumeSkillLabels(data.skills)

  const sectionLabel = (key: string, fallback: string) =>
    theme.sectionLabels[key] ?? fallback

  const sectionRenderers: Record<string, () => React.ReactNode | null> = {
    summary: () =>
      data.summary ? (
        <Section key="summary" title={sectionLabel('summary', 'Summary')} theme={theme}>
          <p
            style={{
              fontSize: theme.bodyFontSize - 0.5,
              color: '#333',
              marginTop: theme.contentSpacing.body,
              lineHeight: theme.lineHeight,
            }}
          >
            {data.summary}
          </p>
        </Section>
      ) : null,

    experience: () =>
      data.experience?.length > 0 ? (
        <Section key="experience" title={sectionLabel('experience', 'Experience')} theme={theme}>
          {data.experience.map(exp => (
            <ExperienceEntry key={exp.id} exp={exp} theme={theme} />
          ))}
        </Section>
      ) : null,

    skills: () =>
      allSkills.length > 0 ? (
        <Section key="skills" title={sectionLabel('skills', 'Skills')} theme={theme}>
          <SkillsContent skills={allSkills} theme={theme} />
        </Section>
      ) : null,

    education: () =>
      data.education?.length > 0 ? (
        <Section key="education" title={sectionLabel('education', 'Education')} theme={theme}>
          {data.education.map(edu => (
            <EducationEntry key={edu.id} edu={edu} theme={theme} />
          ))}
        </Section>
      ) : null,

    projects: () =>
      data.projects?.length > 0 ? (
        <Section key="projects" title={sectionLabel('projects', 'Projects')} theme={theme}>
          {data.projects.map(proj => (
            <div key={proj.id} style={{ marginTop: theme.entrySpacing.project }}>
              <div style={{ fontWeight: 700, fontSize: theme.bodyFontSize }}>{proj.name}</div>
              {proj.technologies?.length > 0 && (
                <div style={{ fontSize: theme.bodyFontSize - 0.5, color: '#444' }}>
                  {proj.technologies.join(', ')}
                </div>
              )}
              {proj.bullets?.map((b, i) => (
                <Bullet key={i} theme={theme}>{b}</Bullet>
              ))}
            </div>
          ))}
        </Section>
      ) : null,
  }

  return (
    <>
      <div
        style={{
          fontSize: theme.nameFontSize,
          fontWeight: 700,
          textAlign: theme.headerAlign,
          marginBottom: theme.contentSpacing.subheading,
        }}
      >
        {data.contact?.name || ''}
      </div>
      <div
        style={{
          fontSize: theme.bodyFontSize - 1,
          color: '#555',
          textAlign: theme.headerAlign,
          marginBottom: theme.entrySpacing.section,
        }}
      >
        {contactLine}
      </div>

      {theme.sectionOrder.map(key => {
        const render = sectionRenderers[key]
        return render ? render() : null
      })}
    </>
  )
}

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: ResumeTheme }) {
  return (
    <div>
      <div
        style={{
          fontSize: theme.bodyFontSize,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: theme.accentColor,
          marginTop: theme.entrySpacing.section,
          marginBottom: theme.contentSpacing.heading,
          paddingBottom: 3,
          borderBottom: `0.5px solid ${theme.accentColor}`,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function Bullet({ children, theme }: { children: React.ReactNode; theme: ResumeTheme }) {
  return (
    <div style={{ display: 'flex', marginTop: theme.contentSpacing.listItem, paddingLeft: 8 }}>
      <span style={{ width: 8, color: '#555' }}>•</span>
      <span
        style={{
          flex: 1,
          fontSize: theme.bodyFontSize - 0.5,
          lineHeight: theme.listLineHeight,
        }}
      >
        {children}
      </span>
    </div>
  )
}

function SkillsContent({ skills, theme }: { skills: string[]; theme: ResumeTheme }) {
  if (theme.skillsLayout === 'columns') {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginTop: theme.contentSpacing.body,
        }}
      >
        {skills.map(skill => (
          <span
            key={skill}
            style={{
              fontSize: theme.bodyFontSize - 0.5,
              color: '#333',
              backgroundColor: '#f0f0f0',
              padding: '2px 6px',
              borderRadius: 3,
            }}
          >
            {skill}
          </span>
        ))}
      </div>
    )
  }

  const separator = theme.skillsLayout === 'comma' ? ', ' : ' · '
  return (
    <p style={{ fontSize: theme.bodyFontSize - 0.5, color: '#333', marginTop: theme.contentSpacing.body }}>
      {skills.join(separator)}
    </p>
  )
}

function ExperienceEntry({
  exp,
  theme,
}: {
  exp: StructuredResume['experience'][number]
  theme: ResumeTheme
}) {
  const { showBy, showLocationBy, showDatesBy } = theme.experienceSettings
  const dateStr = `${exp.startDate} – ${exp.endDate}`
  const locationSuffix = showLocationBy !== 'hidden' && exp.location ? `  ·  ${exp.location}` : ''

  const titleFirst = showBy === 'title-first'
  const primaryText = titleFirst ? exp.title : exp.company
  const secondaryText = titleFirst ? exp.company : exp.title

  const secondaryWithLocation =
    showLocationBy === 'company-line' && titleFirst
      ? `${secondaryText}${locationSuffix}`
      : showLocationBy === 'title-line' && !titleFirst
        ? `${secondaryText}${locationSuffix}`
        : secondaryText

  const primaryWithLocation =
    showLocationBy === 'title-line' && titleFirst
      ? `${primaryText}${locationSuffix}`
      : showLocationBy === 'company-line' && !titleFirst
        ? `${primaryText}${locationSuffix}`
        : primaryText

  if (showDatesBy === 'inline') {
    return (
      <div style={{ marginTop: theme.entrySpacing.experience, marginBottom: theme.contentSpacing.subheading }}>
        <div style={{ fontWeight: 700, fontSize: theme.bodyFontSize }}>
          {primaryWithLocation}
          <span style={{ fontWeight: 400, fontSize: theme.bodyFontSize - 1, color: '#666', fontStyle: 'italic' }}>
            {'  ·  '}{dateStr}
          </span>
        </div>
        {secondaryWithLocation && (
          <div style={{ fontSize: theme.bodyFontSize - 0.5, color: '#444' }}>{secondaryWithLocation}</div>
        )}
        {exp.bullets?.map((b, i) => (
          <Bullet key={i} theme={theme}>{b}</Bullet>
        ))}
      </div>
    )
  }

  return (
    <div style={{ marginTop: theme.entrySpacing.experience, marginBottom: theme.contentSpacing.subheading }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: theme.bodyFontSize }}>{primaryWithLocation}</div>
          {secondaryWithLocation && (
            <div style={{ fontSize: theme.bodyFontSize - 0.5, color: '#444' }}>{secondaryWithLocation}</div>
          )}
        </div>
        <div style={{ fontSize: theme.bodyFontSize - 1, color: '#666', fontStyle: 'italic', textAlign: theme.dateAlign }}>
          {dateStr}
        </div>
      </div>
      {exp.bullets?.map((b, i) => (
        <Bullet key={i} theme={theme}>{b}</Bullet>
      ))}
    </div>
  )
}

function EducationEntry({
  edu,
  theme,
}: {
  edu: StructuredResume['education'][number]
  theme: ResumeTheme
}) {
  const { showBy, layout } = theme.educationSettings
  const dateStr = `${edu.startDate} – ${edu.endDate}`
  const degreeText = `${edu.degree}${edu.field ? ` in ${edu.field}` : ''}`

  const primaryText = showBy === 'degree-first' ? degreeText : edu.institution
  const secondaryText = showBy === 'degree-first' ? edu.institution : degreeText

  if (layout === 'inline') {
    return (
      <div style={{ marginTop: theme.entrySpacing.education }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
          <div style={{ fontSize: theme.bodyFontSize - 0.5, color: '#333' }}>
            <span style={{ fontWeight: 700, fontSize: theme.bodyFontSize }}>{primaryText}</span>
            {', '}
            <span style={{ color: '#444' }}>{secondaryText}</span>
          </div>
          <div style={{ fontSize: theme.bodyFontSize - 1, color: '#666', fontStyle: 'italic' }}>
            {dateStr}
          </div>
        </div>
        {edu.gpa && (
          <div style={{ fontSize: theme.bodyFontSize - 1, color: '#666' }}>GPA: {edu.gpa}</div>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginTop: theme.entrySpacing.education }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700, fontSize: theme.bodyFontSize }}>{primaryText}</div>
        <div style={{ fontSize: theme.bodyFontSize - 1, color: '#666', fontStyle: 'italic', textAlign: theme.dateAlign }}>
          {dateStr}
        </div>
      </div>
      <div style={{ fontSize: theme.bodyFontSize - 0.5, color: '#444' }}>{secondaryText}</div>
      {edu.gpa && (
        <div style={{ fontSize: theme.bodyFontSize - 1, color: '#666' }}>GPA: {edu.gpa}</div>
      )}
    </div>
  )
}
