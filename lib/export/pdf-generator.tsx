import React from 'react'
import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'
import type { StructuredResume } from '@/types'
import { normalizeResumeForDisplay } from '@/lib/format/normalize'
import {
  DEFAULT_RESUME_THEME,
  formatSkillsInline,
  mergeResumeTheme,
  themeToPdfPadding,
  type ResumeTheme,
  type ResumeThemeOverride,
} from '@/lib/export/theme'

function createResumePdfStyles(theme: ResumeTheme) {
  const padding = themeToPdfPadding(theme)
  const headerTextAlign = theme.headerAlign
  const dateTextAlign = theme.dateAlign

  return StyleSheet.create({
    page: {
      fontFamily: theme.fontFamily,
      fontSize: theme.bodyFontSize,
      paddingTop: padding.paddingTop,
      paddingBottom: padding.paddingBottom,
      paddingHorizontal: padding.paddingHorizontal,
      color: '#1a1a1a',
      lineHeight: theme.lineHeight,
    },
    name: {
      fontSize: theme.nameFontSize,
      fontFamily: 'Helvetica-Bold',
      marginBottom: theme.contentSpacing.subheading,
      textAlign: headerTextAlign,
    },
    contactLine: {
      fontSize: theme.bodyFontSize - 1,
      color: '#555555',
      textAlign: headerTextAlign,
      marginBottom: theme.entrySpacing.section,
    },
    sectionTitle: {
      fontSize: theme.bodyFontSize,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: theme.accentColor,
      marginTop: theme.entrySpacing.section,
      marginBottom: theme.contentSpacing.heading,
      paddingBottom: 3,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.accentColor,
    },
    companyRow: {
      flexDirection: 'row',
      justifyContent: dateTextAlign === 'right' ? 'space-between' : 'flex-start',
      marginTop: theme.entrySpacing.experience,
      marginBottom: theme.contentSpacing.subheading,
    },
    eduRow: {
      flexDirection: 'row',
      justifyContent: dateTextAlign === 'right' ? 'space-between' : 'flex-start',
      marginTop: theme.entrySpacing.education,
    },
    jobTitle: {
      fontFamily: 'Helvetica-Bold',
      fontSize: theme.bodyFontSize,
    },
    companyName: {
      fontSize: theme.bodyFontSize - 0.5,
      color: '#444444',
      textAlign: theme.locationAlign,
    },
    dateText: {
      fontSize: theme.bodyFontSize - 1,
      color: '#666666',
      fontFamily: 'Helvetica-Oblique',
      textAlign: dateTextAlign,
    },
    inlineDate: {
      fontSize: theme.bodyFontSize - 1,
      color: '#666666',
      fontFamily: 'Helvetica-Oblique',
    },
    bullet: {
      flexDirection: 'row',
      marginTop: theme.contentSpacing.listItem,
      paddingLeft: 8,
    },
    bulletDot: {
      width: 8,
      color: '#555555',
    },
    bulletText: {
      flex: 1,
      fontSize: theme.bodyFontSize - 0.5,
      lineHeight: theme.listLineHeight,
    },
    skillsText: {
      fontSize: theme.bodyFontSize - 0.5,
      color: '#333333',
      marginTop: theme.contentSpacing.body,
    },
    skillsColumns: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: theme.contentSpacing.body,
      gap: 4,
    },
    skillChip: {
      fontSize: theme.bodyFontSize - 0.5,
      color: '#333333',
      backgroundColor: '#f0f0f0',
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 3,
    },
    summaryText: {
      fontSize: theme.bodyFontSize - 0.5,
      color: '#333333',
      marginTop: theme.contentSpacing.body,
      lineHeight: theme.lineHeight,
    },
    inlineEduText: {
      fontSize: theme.bodyFontSize - 0.5,
      color: '#333333',
    },
  })
}

interface ResumePDFProps {
  data: StructuredResume
  theme?: ResumeTheme
  themeOverride?: ResumeThemeOverride | null
}

export function ResumePDF({ data: rawData, theme, themeOverride }: ResumePDFProps) {
  const resolvedTheme = mergeResumeTheme(theme ?? DEFAULT_RESUME_THEME, themeOverride)
  const styles = createResumePdfStyles(resolvedTheme)
  const data = normalizeResumeForDisplay(rawData)
  const contactLine = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
    data.contact.linkedin,
    data.contact.github,
  ].filter(Boolean).join('  ·  ')

  const allSkills = [
    ...(data.skills?.technical || []),
    ...(data.skills?.tools || []),
    ...(data.skills?.languages || []),
  ]

  const sectionLabel = (key: string, fallback: string) =>
    resolvedTheme.sectionLabels[key] ?? fallback

  const sectionRenderers: Record<string, () => React.ReactNode | null> = {
    summary: () =>
      data.summary ? (
        <View key="summary">
          <Text style={styles.sectionTitle}>{sectionLabel('summary', 'Summary')}</Text>
          <Text style={styles.summaryText}>{data.summary}</Text>
        </View>
      ) : null,

    experience: () =>
      data.experience?.length > 0 ? (
        <View key="experience">
          <Text style={styles.sectionTitle}>{sectionLabel('experience', 'Experience')}</Text>
          {data.experience.map(exp => (
            <ExperienceEntry key={exp.id} exp={exp} theme={resolvedTheme} styles={styles} />
          ))}
        </View>
      ) : null,

    skills: () =>
      allSkills.length > 0 ? (
        <View key="skills">
          <Text style={styles.sectionTitle}>{sectionLabel('skills', 'Skills')}</Text>
          <SkillsContent skills={allSkills} theme={resolvedTheme} styles={styles} />
        </View>
      ) : null,

    education: () =>
      data.education?.length > 0 ? (
        <View key="education">
          <Text style={styles.sectionTitle}>{sectionLabel('education', 'Education')}</Text>
          {data.education.map(edu => (
            <EducationEntry key={edu.id} edu={edu} theme={resolvedTheme} styles={styles} />
          ))}
        </View>
      ) : null,

    projects: () =>
      data.projects?.length > 0 ? (
        <View key="projects">
          <Text style={styles.sectionTitle}>{sectionLabel('projects', 'Projects')}</Text>
          {data.projects.map(proj => (
            <View key={proj.id} style={{ marginTop: resolvedTheme.entrySpacing.project }}>
              <Text style={styles.jobTitle}>{proj.name}</Text>
              {proj.technologies?.length > 0 && (
                <Text style={styles.companyName}>{proj.technologies.join(', ')}</Text>
              )}
              {proj.bullets?.map((bullet, i) => (
                <View key={i} style={styles.bullet}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null,
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{data.contact.name || ''}</Text>
        <Text style={styles.contactLine}>{contactLine}</Text>

        {resolvedTheme.sectionOrder.map(key => {
          const render = sectionRenderers[key]
          return render ? render() : null
        })}
      </Page>
    </Document>
  )
}

type PdfStyles = ReturnType<typeof createResumePdfStyles>

function SkillsContent({
  skills,
  theme,
  styles,
}: {
  skills: string[]
  theme: ResumeTheme
  styles: PdfStyles
}) {
  if (theme.skillsLayout === 'columns') {
    return (
      <View style={styles.skillsColumns}>
        {skills.map(skill => (
          <Text key={skill} style={styles.skillChip}>{skill}</Text>
        ))}
      </View>
    )
  }

  return (
    <Text style={styles.skillsText}>
      {formatSkillsInline(skills, theme.skillsLayout)}
    </Text>
  )
}

function ExperienceEntry({
  exp,
  theme,
  styles,
}: {
  exp: StructuredResume['experience'][number]
  theme: ResumeTheme
  styles: PdfStyles
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
      <View style={{ marginTop: theme.entrySpacing.experience, marginBottom: theme.contentSpacing.subheading }}>
        <Text style={styles.jobTitle}>
          {primaryWithLocation}
          <Text style={styles.inlineDate}>{'  ·  '}{dateStr}</Text>
        </Text>
        {secondaryWithLocation ? (
          <Text style={styles.companyName}>{secondaryWithLocation}</Text>
        ) : null}
        {exp.bullets?.map((bullet, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>
    )
  }

  return (
    <View>
      <View style={styles.companyRow}>
        <View>
          <Text style={styles.jobTitle}>{primaryWithLocation}</Text>
          {secondaryWithLocation ? (
            <Text style={styles.companyName}>{secondaryWithLocation}</Text>
          ) : null}
        </View>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>
      {exp.bullets?.map((bullet, i) => (
        <View key={i} style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ))}
    </View>
  )
}

function EducationEntry({
  edu,
  theme,
  styles,
}: {
  edu: StructuredResume['education'][number]
  theme: ResumeTheme
  styles: PdfStyles
}) {
  const { showBy, layout } = theme.educationSettings
  const dateStr = `${edu.startDate} – ${edu.endDate}`
  const degreeText = `${edu.degree}${edu.field ? ` in ${edu.field}` : ''}`

  const primaryText = showBy === 'degree-first' ? degreeText : edu.institution
  const secondaryText = showBy === 'degree-first' ? edu.institution : degreeText

  if (layout === 'inline') {
    return (
      <View style={styles.eduRow}>
        <Text style={styles.inlineEduText}>
          <Text style={styles.jobTitle}>{primaryText}</Text>
          {', '}
          <Text style={styles.companyName}>{secondaryText}</Text>
        </Text>
        <Text style={styles.dateText}>{dateStr}</Text>
      </View>
    )
  }

  return (
    <View style={styles.eduRow}>
      <View>
        <Text style={styles.jobTitle}>{primaryText}</Text>
        <Text style={styles.companyName}>{secondaryText}</Text>
        {edu.gpa ? <Text style={styles.dateText}>GPA: {edu.gpa}</Text> : null}
      </View>
      <Text style={styles.dateText}>{dateStr}</Text>
    </View>
  )
}

const coverStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 64,
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  name: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  contact: { fontSize: 9.5, color: '#555555', marginBottom: 24 },
  date: { fontSize: 10, color: '#444444', marginBottom: 20 },
  para: { fontSize: 11, marginBottom: 12 },
})

interface CoverLetterPDFProps {
  coverLetter: string
  contact: StructuredResume['contact']
}

export function CoverLetterPDF({ coverLetter, contact }: CoverLetterPDFProps) {
  const name = normalizeResumeForDisplay({ contact } as StructuredResume).contact?.name || ''
  const contactLine = [contact?.email, contact?.phone, contact?.location]
    .filter(Boolean)
    .join('  ·  ')
  const paragraphs = (coverLetter || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Document>
      <Page size="LETTER" style={coverStyles.page}>
        {name ? <Text style={coverStyles.name}>{name}</Text> : null}
        {contactLine ? <Text style={coverStyles.contact}>{contactLine}</Text> : null}
        <Text style={coverStyles.date}>{today}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={coverStyles.para}>{p}</Text>
        ))}
      </Page>
    </Document>
  )
}
