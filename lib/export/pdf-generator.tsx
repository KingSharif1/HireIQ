import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'
import type { StructuredResume } from '@/types'
import { normalizeResumeForDisplay } from '@/lib/format/normalize'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    color: '#1a1a1a',
    lineHeight: 1.4,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  contactLine: {
    fontSize: 9,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#333333',
    marginTop: 14,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 2,
  },
  jobTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  companyName: {
    fontSize: 9.5,
    color: '#444444',
  },
  dateText: {
    fontSize: 9,
    color: '#666666',
    fontFamily: 'Helvetica-Oblique',
  },
  bullet: {
    flexDirection: 'row',
    marginTop: 2,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 8,
    color: '#555555',
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
  },
  skillsText: {
    fontSize: 9.5,
    color: '#333333',
    marginTop: 4,
  },
  summaryText: {
    fontSize: 9.5,
    color: '#333333',
    marginTop: 4,
    lineHeight: 1.5,
  },
})

interface ResumePDFProps {
  data: StructuredResume
}

export function ResumePDF({ data: rawData }: ResumePDFProps) {
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

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <Text style={styles.name}>{data.contact.name || ''}</Text>
        <Text style={styles.contactLine}>{contactLine}</Text>

        {/* Summary */}
        {data.summary && (
          <View>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>{data.summary}</Text>
          </View>
        )}

        {/* Experience */}
        {data.experience?.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {data.experience.map((exp) => (
              <View key={exp.id}>
                <View style={styles.companyRow}>
                  <View>
                    <Text style={styles.jobTitle}>{exp.title}</Text>
                    <Text style={styles.companyName}>
                      {exp.company}{exp.location ? `  ·  ${exp.location}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{exp.startDate} – {exp.endDate}</Text>
                </View>
                {exp.bullets?.map((bullet, i) => (
                  <View key={i} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {allSkills.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.skillsText}>{allSkills.join('  ·  ')}</Text>
          </View>
        )}

        {/* Education */}
        {data.education?.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {data.education.map((edu) => (
              <View key={edu.id} style={{ marginTop: 6 }}>
                <View style={styles.companyRow}>
                  <Text style={styles.jobTitle}>
                    {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                  </Text>
                  <Text style={styles.dateText}>{edu.startDate} – {edu.endDate}</Text>
                </View>
                <Text style={styles.companyName}>{edu.institution}</Text>
                {edu.gpa && <Text style={styles.dateText}>GPA: {edu.gpa}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {data.projects?.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Projects</Text>
            {data.projects.map((proj) => (
              <View key={proj.id} style={{ marginTop: 6 }}>
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
        )}
      </Page>
    </Document>
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
