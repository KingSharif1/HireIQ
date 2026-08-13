import { redirect } from 'next/navigation'

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
  if (params.section) {
    redirect(`/dashboard/builder?view=master&section=${encodeURIComponent(params.section)}`)
  }
  redirect('/dashboard/builder?view=master')
}
