import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Briefcase, ArrowRight, Plus } from 'lucide-react'
import { scoreColor, cn } from '@/lib/utils'

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [jobsRes, tailoredRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, company, title, location, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tailored_resumes')
      .select('id, job_id, tailored_score, match_score, created_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  const jobs = jobsRes.data ?? []
  const tailored = tailoredRes.data ?? []
  const latestByJob = new Map<string, (typeof tailored)[number]>()
  for (const row of tailored) {
    if (!latestByJob.has(row.job_id)) latestByJob.set(row.job_id, row)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track jobs you&apos;re targeting — tailor, review, and apply.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs">
            <Plus className="w-4 h-4" />
            Add job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card className="text-center border-dashed border-brand-purple/30">
          <CardContent className="py-12 space-y-4">
            <div className="w-14 h-14 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto">
              <Briefcase className="w-7 h-7 text-brand-purple" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">No applications yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Add a job description to start tailoring. Your master profile lives under Profile → Documents.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/jobs">Add your first job</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => {
            const latest = latestByJob.get(job.id)
            const score = latest?.tailored_score ?? latest?.match_score
            return (
              <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                <Card className="hover:border-brand-purple/40 transition-colors">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-brand-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {job.company}{job.location ? ` · ${job.location}` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={latest ? 'success' : 'muted'}>
                          {latest ? 'Tailored' : 'Not started'}
                        </Badge>
                        {score != null && (
                          <span className={cn('text-xs font-medium', scoreColor(score))}>{score}% fit</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
