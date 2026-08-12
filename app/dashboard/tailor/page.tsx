import { redirect } from 'next/navigation'

/** Tailor stepper retired — land on tracker (optional jobId preserved). */
export default async function TailorRedirect({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>
}) {
  const { jobId } = await searchParams
  if (jobId) {
    redirect(`/dashboard/tracker/${jobId}?tab=documents`)
  }
  redirect('/dashboard/tracker')
}
