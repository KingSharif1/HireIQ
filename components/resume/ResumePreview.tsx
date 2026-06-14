'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2, FileText, AlertTriangle, CheckCircle2, MinusCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeResumeForDisplay } from '@/lib/format/normalize'
import { checkResumeHealth, healthScore, type HealthSeverity } from '@/lib/resume/health'
import type { StructuredResume } from '@/types'

/**
 * WYSIWYG preview of the exported PDF. Mirrors lib/export/pdf-generator.tsx
 * (LETTER page, Helvetica, same sizes/spacing). Renders content as discrete
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
}

// Letter page geometry at 96 DPI (matches the PDF generator).
const DPI = 96
const PAGE_W = 8.5 * DPI // 816
const PAGE_H = 11 * DPI // 1056
const PAD_Y = 40
const PAD_X = 48
const USABLE = PAGE_H - PAD_Y * 2 // content height per page
const BODY_W = PAGE_W - PAD_X * 2

export function ResumePreview({
  data: rawData,
  scale,
  showTools = true,
  showHealth = false,
  recommendedPages = 0,
}: ResumePreviewProps) {
  const data = useMemo(() => normalizeResumeForDisplay(rawData), [rawData])

  const measureRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(scale ?? 0.85)
  const [autoFit, setAutoFit] = useState(scale == null)
  const [pageCount, setPageCount] = useState(1)

  const measure = useCallback(() => {
    const el = measureRef.current
    if (!el) return
    setPageCount(Math.max(1, Math.ceil(el.scrollHeight / USABLE - 0.02)))
  }, [])

  useEffect(() => {
    measure()
    const el = measureRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, data])

  useEffect(() => {
    if (!autoFit) return
    const el = containerRef.current
    if (!el) return
    const fit = () => {
      const avail = el.clientWidth - 32
      setZoom(Math.min(1, Math.max(0.4, avail / PAGE_W)))
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
    setZoom(z => Math.min(1, Math.max(0.4, +(z + delta).toFixed(2))))
  }

  const body = <ResumeBody data={data} />

  return (
    <div className="w-full">
      {showTools && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
            <button onClick={() => zoomBy(-0.1)} className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" aria-label="Zoom out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-xs text-muted-foreground tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => zoomBy(0.1)} className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" aria-label="Zoom in">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAutoFit(true)}
              className={cn('p-1.5 rounded-md transition-colors', autoFit ? 'text-brand-purple' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
              aria-label="Fit to width"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showHealth && health.length > 0 && (
        <HealthPanel checks={health} score={score} />
      )}

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
          width: BODY_W,
          color: '#1a1a1a',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: 10,
          lineHeight: 1.4,
        }}
      >
        {body}
      </div>

      {/* Page sheets */}
      <div ref={containerRef} className="w-full overflow-auto bg-neutral-200 dark:bg-neutral-800 rounded-xl p-4">
        <div className="flex flex-col items-center gap-5">
          {Array.from({ length: pageCount }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div style={{ width: PAGE_W * zoom, height: PAGE_H * zoom }}>
                <div
                  className="bg-white shadow-xl origin-top-left relative overflow-hidden"
                  style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${zoom})` }}
                >
                  {/* Clipped content window for this page. */}
                  <div style={{ position: 'absolute', top: PAD_Y, left: PAD_X, width: BODY_W, height: USABLE, overflow: 'hidden' }}>
                    <div
                      style={{
                        transform: `translateY(-${i * USABLE}px)`,
                        color: '#1a1a1a',
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        fontSize: 10,
                        lineHeight: 1.4,
                      }}
                    >
                      {body}
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground">Page {i + 1} of {pageCount}</span>
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

function ResumeBody({ data }: { data: StructuredResume }) {
  const contactLine = [
    data.contact?.email,
    data.contact?.phone,
    data.contact?.location,
    data.contact?.linkedin,
    data.contact?.github,
  ].filter(Boolean).join('  ·  ')

  const allSkills = [
    ...(data.skills?.technical || []),
    ...(data.skills?.tools || []),
    ...(data.skills?.languages || []),
  ]

  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
        {data.contact?.name || ''}
      </div>
      <div style={{ fontSize: 9, color: '#555', textAlign: 'center', marginBottom: 16 }}>
        {contactLine}
      </div>

      {data.summary && (
        <Section title="Summary">
          <p style={{ fontSize: 9.5, color: '#333', marginTop: 4, lineHeight: 1.5 }}>{data.summary}</p>
        </Section>
      )}

      {data.experience?.length > 0 && (
        <Section title="Experience">
          {data.experience.map(exp => (
            <div key={exp.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, marginBottom: 2 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 10 }}>{exp.title}</div>
                  <div style={{ fontSize: 9.5, color: '#444' }}>
                    {exp.company}{exp.location ? `  ·  ${exp.location}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 9, color: '#666', fontStyle: 'italic' }}>
                  {exp.startDate} – {exp.endDate}
                </div>
              </div>
              {exp.bullets?.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
            </div>
          ))}
        </Section>
      )}

      {allSkills.length > 0 && (
        <Section title="Skills">
          <p style={{ fontSize: 9.5, color: '#333', marginTop: 4 }}>{allSkills.join('  ·  ')}</p>
        </Section>
      )}

      {data.education?.length > 0 && (
        <Section title="Education">
          {data.education.map(edu => (
            <div key={edu.id} style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: 10 }}>
                  {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                </div>
                <div style={{ fontSize: 9, color: '#666', fontStyle: 'italic' }}>
                  {edu.startDate} – {edu.endDate}
                </div>
              </div>
              <div style={{ fontSize: 9.5, color: '#444' }}>{edu.institution}</div>
              {edu.gpa && <div style={{ fontSize: 9, color: '#666' }}>GPA: {edu.gpa}</div>}
            </div>
          ))}
        </Section>
      )}

      {data.projects?.length > 0 && (
        <Section title="Projects">
          {data.projects.map(proj => (
            <div key={proj.id} style={{ marginTop: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 10 }}>{proj.name}</div>
              {proj.technologies?.length > 0 && (
                <div style={{ fontSize: 9.5, color: '#444' }}>{proj.technologies.join(', ')}</div>
              )}
              {proj.bullets?.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
            </div>
          ))}
        </Section>
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: '#333',
          marginTop: 14,
          marginBottom: 4,
          paddingBottom: 3,
          borderBottom: '0.5px solid #ccc',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', marginTop: 2, paddingLeft: 8 }}>
      <span style={{ width: 8, color: '#555' }}>•</span>
      <span style={{ flex: 1, fontSize: 9.5 }}>{children}</span>
    </div>
  )
}
