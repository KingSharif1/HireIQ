import Link from 'next/link'
import { FileText, Star, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Resume } from '@/types'

interface ResumeCardProps {
  resume: Resume
}

export function ResumeCard({ resume }: ResumeCardProps) {
  const name = resume.structured_data?.contact?.name || 'Unnamed'
  const expCount = resume.structured_data?.experience?.length ?? 0
  const skillCount = [
    ...(resume.structured_data?.skills?.technical ?? []),
    ...(resume.structured_data?.skills?.tools ?? []),
  ].length

  return (
    <Link href={`/dashboard/resume/${resume.id}`}>
      <Card className="hover:border-brand-purple/40 transition-all cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-brand-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm text-foreground truncate">{resume.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{name}</p>
                </div>
                {resume.is_primary && (
                  <Badge variant="default" className="flex-shrink-0 gap-1">
                    <Star className="w-3 h-3" />Primary
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-3">
                {resume.ats_format_score != null && (
                  <Badge variant={resume.ats_format_score >= 70 ? 'success' : 'warning'}>
                    Format: {resume.ats_format_score}%
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{expCount} roles</span>
                <span className="text-xs text-muted-foreground">{skillCount} skills</span>
              </div>

              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {new Date(resume.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
