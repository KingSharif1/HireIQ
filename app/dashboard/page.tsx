import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Briefcase, Sparkles, ArrowRight } from 'lucide-react'

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [resumesRes, jobsRes, tailoredRes] = await Promise.all([
    supabase.from('resumes').select('id', { count: 'exact' }).eq('user_id', user!.id),
    supabase.from('jobs').select('id', { count: 'exact' }).eq('user_id', user!.id),
    supabase.from('tailored_resumes').select('id, tailored_score, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(3),
  ])

  const resumeCount = resumesRes.count ?? 0
  const jobCount = jobsRes.count ?? 0
  const recentTailored = tailoredRes.data ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Let&apos;s get you that interview.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard/resume/upload">
          <Card className="hover:border-brand-purple/50 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-purple/15 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-brand-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Upload Resume</p>
                <p className="text-xs text-muted-foreground">{resumeCount} saved</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-purple transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/jobs">
          <Card className="hover:border-brand-purple/50 transition-colors cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Add Job</p>
                <p className="text-xs text-muted-foreground">{jobCount} saved</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/tailor">
          <Card className="hover:border-brand-green/50 transition-colors cursor-pointer group bg-brand-green/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-green/15 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-brand-green" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Tailor Resume</p>
                <p className="text-xs text-muted-foreground">Start here →</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-green transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent tailored resumes */}
      {recentTailored.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Tailored Resumes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTailored.map((tr) => (
              <Link
                key={tr.id}
                href={`/dashboard/tailor/${tr.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors"
              >
                <span className="text-sm text-muted-foreground">
                  {new Date(tr.created_at).toLocaleDateString()}
                </span>
                {tr.tailored_score != null && (
                  <span className="text-sm font-medium text-brand-green">
                    {tr.tailored_score}% match
                  </span>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {resumeCount === 0 && (
        <Card className="text-center border-dashed border-brand-purple/30">
          <CardContent className="py-12 space-y-4">
            <div className="w-14 h-14 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7 text-brand-purple" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Get started in 2 minutes</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your resume, paste a job description, and get a tailored version that beats ATS filters.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/resume/upload">Upload your resume</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
