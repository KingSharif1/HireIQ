import { redirect } from 'next/navigation'

/**
 * Resume management now lives inside the profile (Profile → Resumes), so the
 * standalone list page redirects there to keep a single home for resumes.
 */
export default function ResumesPage() {
  redirect('/dashboard/profile?section=resumes')
}
