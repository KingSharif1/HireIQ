import { load } from 'cheerio'
import type { ExtractionResult } from '@/lib/jobs/fetch-types'

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function readJobPosting(node: Record<string, unknown>): ExtractionResult | null {
  const type = node['@type']
  const types = Array.isArray(type) ? type : [type]
  if (!types.some(t => t === 'JobPosting' || t === 'https://schema.org/JobPosting')) {
    return null
  }

  const title = typeof node.title === 'string' ? node.title.trim() : ''
  const descriptionRaw = node.description
  const description =
    typeof descriptionRaw === 'string'
      ? stripHtml(descriptionRaw)
      : ''

  const hiringOrg = node.hiringOrganization
  let company = ''
  if (hiringOrg && typeof hiringOrg === 'object' && !Array.isArray(hiringOrg)) {
    const name = (hiringOrg as Record<string, unknown>).name
    if (typeof name === 'string') company = name.trim()
  }

  const parts = [title, description].filter(Boolean)
  const text = parts.join('\n\n').trim()
  if (text.length < 60 && description.length < 40) return null

  return {
    text,
    title: title || 'Untitled role',
    company,
    method: 'json-ld',
    confidence: description.length >= 200 ? 'high' : 'medium',
  }
}

function parseJsonLdBlock(raw: string): ExtractionResult | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item === 'object') {
          const hit = readJobPosting(item as Record<string, unknown>)
          if (hit) return hit
        }
      }
      return null
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      const direct = readJobPosting(obj)
      if (direct) return direct
      const graph = obj['@graph']
      if (Array.isArray(graph)) {
        for (const item of graph) {
          if (item && typeof item === 'object') {
            const hit = readJobPosting(item as Record<string, unknown>)
            if (hit) return hit
          }
        }
      }
    }
  } catch {
    return null
  }
  return null
}

/** Extract JobPosting from schema.org JSON-LD script tags. */
export function extractFromJsonLd(html: string): ExtractionResult | null {
  const $ = load(html)
  const scripts = $('script[type="application/ld+json"]')

  for (let i = 0; i < scripts.length; i++) {
    const raw = $(scripts[i]).html()?.trim()
    if (!raw) continue
    const hit = parseJsonLdBlock(raw)
    if (hit) return hit
  }

  return null
}
