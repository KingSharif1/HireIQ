/** sessionStorage flag so a remount cannot auto-start a second paid tailor. */
export type TailorSessionFlag = 'running' | 'done'

export function tailorSessionKey(jobId: string): string {
  return `hireiq:tailor-once:${jobId}`
}

/** Auto-start only if this tab has never started a tailor for this job. */
export function shouldAutoStartTailor(flag: TailorSessionFlag | null): boolean {
  return flag == null
}

export function readTailorSession(jobId: string): TailorSessionFlag | null {
  if (typeof sessionStorage === 'undefined') return null
  const raw = sessionStorage.getItem(tailorSessionKey(jobId))
  if (raw === 'running' || raw === 'done') return raw
  return null
}

export function writeTailorSession(jobId: string, flag: TailorSessionFlag): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(tailorSessionKey(jobId), flag)
}

export function clearTailorSession(jobId: string): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(tailorSessionKey(jobId))
}
