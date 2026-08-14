import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RESUME_THEME,
  applyDensity,
  inferDensity,
  mergeResumeTheme,
  themeToPdfPadding,
} from '@/lib/export/theme'

describe('DEFAULT_RESUME_THEME', () => {
  it('uses Helvetica and center header matching current PDF defaults', () => {
    expect(DEFAULT_RESUME_THEME.fontFamily).toBe('Helvetica')
    expect(DEFAULT_RESUME_THEME.headerAlign).toBe('center')
    expect(DEFAULT_RESUME_THEME.nameFontSize).toBe(22)
    expect(DEFAULT_RESUME_THEME.bodyFontSize).toBe(10)
    expect(DEFAULT_RESUME_THEME.marginX).toBe(0.5)
    expect(DEFAULT_RESUME_THEME.marginY).toBe(0.5)
  })

  it('includes standard section order and labels', () => {
    expect(DEFAULT_RESUME_THEME.sectionOrder).toEqual([
      'summary',
      'experience',
      'skills',
      'education',
      'projects',
    ])
    expect(DEFAULT_RESUME_THEME.sectionLabels.experience).toBe('Experience')
  })
})

describe('themeToPdfPadding', () => {
  it('converts inch margins to react-pdf points', () => {
    const padding = themeToPdfPadding(DEFAULT_RESUME_THEME)
    expect(padding.paddingTop).toBe(36)
    expect(padding.paddingBottom).toBe(36)
    expect(padding.paddingHorizontal).toBe(36)
  })
})

describe('mergeResumeTheme', () => {
  it('returns a copy of master when override is null or omitted', () => {
    const merged = mergeResumeTheme(DEFAULT_RESUME_THEME)
    expect(merged).toEqual(DEFAULT_RESUME_THEME)
    expect(merged).not.toBe(DEFAULT_RESUME_THEME)
  })

  it('merges sparse overrides without dropping nested defaults', () => {
    const merged = mergeResumeTheme(DEFAULT_RESUME_THEME, {
      accentColor: '#0066cc',
      headerAlign: 'left',
      experienceSettings: { showDatesBy: 'inline' },
      sectionLabels: { skills: 'Core Skills' },
    })

    expect(merged.accentColor).toBe('#0066cc')
    expect(merged.headerAlign).toBe('left')
    expect(merged.fontFamily).toBe('Helvetica')
    expect(merged.experienceSettings.showDatesBy).toBe('inline')
    expect(merged.experienceSettings.showBy).toBe('title-first')
    expect(merged.sectionLabels.skills).toBe('Core Skills')
    expect(merged.sectionLabels.experience).toBe('Experience')
  })

  it('replaces sectionOrder when provided', () => {
    const order = ['experience', 'summary']
    const merged = mergeResumeTheme(DEFAULT_RESUME_THEME, { sectionOrder: order })
    expect(merged.sectionOrder).toEqual(order)
  })
})

describe('density presets', () => {
  it('compact shrinks type and spacing for one-page ATS layouts', () => {
    const compact = applyDensity(DEFAULT_RESUME_THEME, 'compact')
    expect(inferDensity(compact)).toBe('compact')
    expect(compact.bodyFontSize).toBe(9)
    expect(compact.entrySpacing.experience).toBeLessThan(DEFAULT_RESUME_THEME.entrySpacing.experience)
  })

  it('spacious is easier to read for a human recruiter', () => {
    const spacious = applyDensity(DEFAULT_RESUME_THEME, 'spacious')
    expect(inferDensity(spacious)).toBe('spacious')
    expect(spacious.lineHeight).toBeGreaterThan(DEFAULT_RESUME_THEME.lineHeight)
  })
})
