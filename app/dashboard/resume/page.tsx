import { redirect } from 'next/navigation'

/** Legacy resume list → Resume Builder files. */
export default function ResumeIndexRedirect() {
  redirect('/dashboard/builder?view=files')
}
