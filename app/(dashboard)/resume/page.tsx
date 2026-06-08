import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ResumeCard } from '@/components/resume/ResumeCard'
import { Plus, FileText } from 'lucide-react'

export default async function ResumesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: resumes } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Resumes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {resumes?.length ?? 0} saved
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/resume/upload">
            <Plus className="w-4 h-4" />
            Upload
          </Link>
        </Button>
      </div>

      {resumes && resumes.length > 0 ? (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">No resumes yet</p>
          <p className="text-sm text-muted-foreground mb-4">Upload your resume to get started</p>
          <Button asChild>
            <Link href="/dashboard/resume/upload">Upload Resume</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
