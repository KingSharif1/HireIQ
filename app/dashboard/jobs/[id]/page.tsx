import { redirect } from 'next/navigation'

/** Legacy Job Hub → full-page application detail */
export default async function JobDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard/tracker/${id}`)
}
