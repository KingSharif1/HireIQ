import { redirect } from 'next/navigation'
import { profilePath } from '@/lib/profile/paths'

export const dynamic = 'force-dynamic'

/**
 * Legacy Teal master workspace — retired.
 * Master edits live on Profile; job tools live on Applications → Documents.
 */
export default async function BuilderMasterPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; jobId?: string; section?: string }>
}) {
  const params = await searchParams
  if (params.jobId) {
    redirect(`/dashboard/tracker/${params.jobId}?tab=documents`)
  }
  redirect(profilePath(params.section ?? null))
}
