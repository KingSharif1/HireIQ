import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { ResumeExperience, ResumeProject } from '@/types'

export default async function ResumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: resume } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!resume) notFound()

  const data = resume.structured_data
  const allSkills = [...(data.skills?.technical || []), ...(data.skills?.tools || [])]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/builder" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{resume.title}</h1>
            {resume.ats_format_score != null && (
              <Badge variant={resume.ats_format_score >= 70 ? 'success' : 'warning'} className="mt-1">
                Format score: {resume.ats_format_score}%
              </Badge>
            )}
          </div>
        </div>
        {resume.original_file_url && (
          <Button asChild variant="outline">
            <a href={resume.original_file_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />View original upload
            </a>
          </Button>
        )}
        <Button asChild>
          <Link href="/dashboard/profile">Open master</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Contact */}
          <div>
            <h2 className="text-xl font-bold text-foreground">{data.contact?.name}</h2>
            <p className="text-sm text-muted-foreground">
              {[data.contact?.email, data.contact?.phone, data.contact?.location].filter(Boolean).join(' · ')}
            </p>
            {data.contact?.linkedin && (
              <p className="text-xs text-muted-foreground mt-0.5">{data.contact.linkedin}</p>
            )}
          </div>

          {data.summary && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
                <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>
              </div>
            </>
          )}

          {data.experience?.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Experience</p>
                <div className="space-y-5">
                  {data.experience.map((exp: ResumeExperience) => (
                    <div key={exp.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{exp.title}</p>
                          <p className="text-xs text-muted-foreground">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                        </div>
                        <p className="text-xs text-muted-foreground flex-shrink-0">
                          {exp.startDate} – {exp.endDate}
                        </p>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {exp.bullets?.map((bullet: string, i: number) => (
                          <li key={i} className="text-sm text-foreground flex gap-2">
                            <span className="text-muted-foreground mt-0.5">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {allSkills.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {allSkills.slice(0, 30).map(skill => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {data.education?.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Education</p>
                {data.education.map((edu: { id: string; degree: string; field: string; institution: string; startDate: string; endDate: string; gpa: string }) => (
                  <div key={edu.id} className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">{edu.institution}</p>
                      {edu.gpa && <p className="text-xs text-muted-foreground">GPA: {edu.gpa}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground flex-shrink-0">
                      {edu.startDate} – {edu.endDate}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {data.projects?.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Projects</p>
                <div className="space-y-4">
                  {data.projects.map((proj: ResumeProject) => (
                    <div key={proj.id}>
                      <p className="font-semibold text-sm text-foreground">{proj.name}</p>
                      {proj.technologies?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{proj.technologies.join(', ')}</p>
                      )}
                      <ul className="mt-1.5 space-y-1">
                        {proj.bullets?.map((bullet: string, i: number) => (
                          <li key={i} className="text-sm text-foreground flex gap-2">
                            <span className="text-muted-foreground mt-0.5">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
