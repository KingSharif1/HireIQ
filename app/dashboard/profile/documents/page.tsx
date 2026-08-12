import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Legacy Documents door → unified Profile (documents strip). */
export default async function ProfileDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const { section } = await searchParams
  const q = new URLSearchParams()
  if (section) q.set('section', section)
  else q.set('section', 'resumes')
  redirect(`/dashboard/profile?${q.toString()}`)
}
