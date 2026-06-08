import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType,
} from 'docx'
import type { StructuredResume } from '@/types'

function hr(): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
    spacing: { after: 120 },
  })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, color: '333333' })],
    spacing: { before: 240, after: 120 },
  })
}

export async function generateDocx(data: StructuredResume): Promise<Buffer> {
  const children: Paragraph[] = []

  // Name
  children.push(new Paragraph({
    children: [new TextRun({ text: data.contact.name || '', bold: true, size: 36 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }))

  // Contact line
  const contactParts = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
    data.contact.linkedin ? `LinkedIn: ${data.contact.linkedin}` : null,
    data.contact.github ? `GitHub: ${data.contact.github}` : null,
  ].filter(Boolean).join('  |  ')

  children.push(new Paragraph({
    children: [new TextRun({ text: contactParts, size: 18, color: '666666' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }))

  // Summary
  if (data.summary) {
    children.push(sectionHeading('Summary'))
    children.push(hr())
    children.push(new Paragraph({
      children: [new TextRun({ text: data.summary, size: 20 })],
      spacing: { after: 120 },
    }))
  }

  // Experience
  if (data.experience?.length > 0) {
    children.push(sectionHeading('Experience'))
    children.push(hr())

    for (const exp of data.experience) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.title || '', bold: true, size: 22 }),
          new TextRun({ text: `  ${exp.company}${exp.location ? ` · ${exp.location}` : ''}`, size: 20, color: '555555' }),
        ],
        spacing: { after: 40 },
      }))

      children.push(new Paragraph({
        children: [new TextRun({
          text: `${exp.startDate} – ${exp.endDate}`,
          size: 18, italics: true, color: '777777',
        })],
        spacing: { after: 80 },
      }))

      for (const bullet of (exp.bullets || [])) {
        children.push(new Paragraph({
          children: [new TextRun({ text: bullet, size: 20 })],
          bullet: { level: 0 },
          spacing: { after: 40 },
        }))
      }

      children.push(new Paragraph({ spacing: { after: 120 } }))
    }
  }

  // Skills
  const allSkills = [
    ...(data.skills?.technical || []),
    ...(data.skills?.tools || []),
    ...(data.skills?.languages || []),
  ]
  if (allSkills.length > 0) {
    children.push(sectionHeading('Skills'))
    children.push(hr())
    children.push(new Paragraph({
      children: [new TextRun({ text: allSkills.join(' · '), size: 20 })],
      spacing: { after: 120 },
    }))
  }

  // Education
  if (data.education?.length > 0) {
    children.push(sectionHeading('Education'))
    children.push(hr())

    for (const edu of data.education) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${edu.degree}${edu.field ? ` in ${edu.field}` : ''}`, bold: true, size: 22 }),
          new TextRun({ text: `  ${edu.institution}`, size: 20, color: '555555' }),
        ],
        spacing: { after: 40 },
      }))

      children.push(new Paragraph({
        children: [new TextRun({
          text: `${edu.startDate} – ${edu.endDate}${edu.gpa ? ` · GPA: ${edu.gpa}` : ''}`,
          size: 18, italics: true, color: '777777',
        })],
        spacing: { after: 120 },
      }))
    }
  }

  // Projects
  if (data.projects?.length > 0) {
    children.push(sectionHeading('Projects'))
    children.push(hr())

    for (const proj of data.projects) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: proj.name, bold: true, size: 22 }),
          proj.technologies?.length
            ? new TextRun({ text: `  ${proj.technologies.join(', ')}`, size: 18, color: '777777' })
            : new TextRun({ text: '' }),
        ],
        spacing: { after: 40 },
      }))

      for (const bullet of (proj.bullets || [])) {
        children.push(new Paragraph({
          children: [new TextRun({ text: bullet, size: 20 })],
          bullet: { level: 0 },
          spacing: { after: 40 },
        }))
      }

      children.push(new Paragraph({ spacing: { after: 120 } }))
    }
  }

  const doc = new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 },
        },
      },
    },
  })

  return await Packer.toBuffer(doc)
}
