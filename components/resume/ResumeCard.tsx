'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FileText, Star, Calendar, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Resume } from '@/types'

interface ResumeCardProps {
  resume: Resume
}

export function ResumeCard({ resume }: ResumeCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const name = resume.structured_data?.contact?.name || 'Unnamed'
  const expCount = resume.structured_data?.experience?.length ?? 0
  const skillCount = [
    ...(resume.structured_data?.skills?.technical ?? []),
    ...(resume.structured_data?.skills?.tools ?? []),
  ].length

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/resume/${resume.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error || 'Delete failed')
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete resume')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="hover:border-brand-purple/40 transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Link href={`/dashboard/resume/${resume.id}`} className="flex items-start gap-3 flex-1 min-w-0">
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
          </Link>

          <Button
            type="button"
            variant={confirmDelete ? 'destructive' : 'ghost'}
            size="sm"
            className="flex-shrink-0"
            disabled={deleting}
            onClick={() => void handleDelete()}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 className="w-4 h-4" />
            {confirmDelete ? 'Confirm' : ''}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
