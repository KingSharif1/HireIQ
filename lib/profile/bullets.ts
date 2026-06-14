import { uid } from './data'

/** Ensure bulletIds array matches bullets length; generate ids for new bullets. */
export function syncBulletIds(
  bullets: string[],
  existingIds: string[] | undefined,
  idPrefix = 'bul'
): string[] {
  const ids = [...(existingIds ?? [])]
  while (ids.length < bullets.length) {
    ids.push(uid(idPrefix))
  }
  return ids.slice(0, bullets.length)
}

export function bulletsWithIds(
  bullets: string[],
  existingIds: string[] | undefined,
  idPrefix = 'bul'
): { bullets: string[]; bulletIds: string[] } {
  return {
    bullets,
    bulletIds: syncBulletIds(bullets, existingIds, idPrefix),
  }
}

/** Word-level similarity 0–1 for heavy-edit detection (Q10). */
export function textSimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\s+/).filter(Boolean))
  const wb = new Set(b.toLowerCase().split(/\s+/).filter(Boolean))
  if (wa.size === 0 && wb.size === 0) return 1
  if (wa.size === 0 || wb.size === 0) return 0
  let overlap = 0
  for (const w of wa) {
    if (wb.has(w)) overlap++
  }
  return overlap / Math.max(wa.size, wb.size)
}

export const HEAVY_EDIT_THRESHOLD = 0.45

export function isHeavyEdit(before: string, after: string): boolean {
  const a = before.trim()
  const b = after.trim()
  if (!a || !b) return false
  return textSimilarity(a, b) < HEAVY_EDIT_THRESHOLD
}
