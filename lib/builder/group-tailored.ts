export type TailoredLibraryRow = {
  id: string
  job_id: string
  version?: number
  tailored_score: number | null
  match_score: number | null
  created_at: string
  job_title: string | null
  company: string | null
  apply_url?: string | null
}

export type TailoredJobGroup = {
  folderKey: string
  jobId: string
  jobTitle: string
  company: string | null
  applyUrl: string | null
  latest: TailoredLibraryRow
  versions: TailoredLibraryRow[]
}

function folderKey(row: TailoredLibraryRow): string {
  const title = (row.job_title ?? '').trim().toLowerCase()
  const company = (row.company ?? '').trim().toLowerCase()
  if (title || company) return `${title}|${company}`
  return `id:${row.job_id}`
}

export function groupTailoredByJob(rows: TailoredLibraryRow[]): TailoredJobGroup[] {
  const map = new Map<string, TailoredLibraryRow[]>()
  for (const row of rows) {
    const key = folderKey(row)
    const list = map.get(key) ?? []
    list.push(row)
    map.set(key, list)
  }

  const groups: TailoredJobGroup[] = []
  for (const [key, versions] of map) {
    const sorted = [...versions].sort((a, b) => {
      const av = a.version ?? 0
      const bv = b.version ?? 0
      if (bv !== av) return bv - av
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    const latest = sorted[0]
    groups.push({
      folderKey: key,
      jobId: latest.job_id,
      jobTitle: latest.job_title?.trim() || 'Untitled role',
      company: latest.company,
      applyUrl: latest.apply_url ?? null,
      latest,
      versions: sorted,
    })
  }

  return groups.sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  )
}
