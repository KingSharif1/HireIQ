import { redirect } from 'next/navigation'

/** Legacy resume list → Profile documents strip. */
export default function ResumeIndexRedirect() {
  redirect('/dashboard/profile?section=resumes')
}
